import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  mixin,
  type NestInterceptor,
  type OnModuleInit,
  Optional,
  StreamableFile,
  type Type,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as coreInternal from '@nestjs/core/internal';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { catchError, concatMap, from, type Observable, throwError } from 'rxjs';
import { finished } from 'stream';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants.js';
import type {
  MultipartModuleOptions,
  MultipartOptions,
  MultipartStorageEngine,
  UploadedMultipartFile,
} from '../interfaces/index.js';
import {
  MISSING_PLUGIN_MESSAGE,
  PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE,
  UPLOAD_DISCARDED_MESSAGE,
  WRONG_ADAPTER_MESSAGE,
} from './multipart.constants.js';
import {
  drainRequest,
  processMultipart,
  processStream,
  removeFiles,
  resolveStorage,
  type UploadSpec,
  validateLimits,
} from './multipart.parser.js';
import { mergeMultipartOptions } from './multipart.utils.js';
import type { FastifyAdapter } from '../../adapters/fastify-adapter.js';

/**
 * Set on a request whose pipes rejected it, by the router of
 * `@nestjs/core` (see `markRejectedByPipes()` there). Read through the
 * registered symbol rather than an import, so this package still loads with
 * a version of `@nestjs/core` that does not set it.
 */
const REJECTED_BY_PIPES = Symbol.for('nestjs:rejected-by-pipes');

function isRejectedByPipes(req: any): boolean {
  if (req?.[REJECTED_BY_PIPES] === true) {
    return true;
  }
  // `@nestjs/core` 12.2.0 keeps the record to itself, so ask its helper too.
  // Read off the namespace, since a named import fails with an older core.
  const core = coreInternal as {
    isRejectedByPipes?: (req: unknown) => boolean;
  };
  return core.isRejectedByPipes?.(req) === true;
}

/**
 * Destroys the request if the response is sent while its body is still being
 * received, e.g. by an interceptor bound earlier that timed out: the route
 * handler would then never run, and nothing would remove the files stored
 * meanwhile. `@fastify/multipart` fails the parts iterator of a destroyed
 * request, and `processMultipart()` then removes what it stored. Returns a
 * function that stops watching.
 */
function destroyWhenAnswered(req: FastifyRequest, reply: FastifyReply) {
  const raw = req?.raw;
  const response = reply?.raw;
  // A stand-in for a reply (e.g. in a unit test) is not watched.
  if (typeof response?.on !== 'function' || !raw) {
    return () => undefined;
  }
  let isReceiving = true;
  let stopWatching: () => void;
  try {
    stopWatching = finished(response, () => {
      if (isReceiving && !raw.complete) {
        raw.destroy();
      }
    });
  } catch {
    return () => undefined;
  }
  return () => {
    isReceiving = false;
    stopWatching();
  };
}

const verifiedInstances = new WeakSet<object>();

/**
 * Asks the FastifyAdapter to register the `@fastify/multipart` plugin (it
 * skips that when the plugin is registered already, or when its
 * `multipart` option is `false`), and fails the application's startup with
 * an actionable message if the plugin still is not registered once every
 * plugin has loaded. Without the plugin, Fastify answers every multipart
 * request with a bare 415 before any interceptor runs.
 *
 * This runs from `onModuleInit`, before Fastify's `ready()`: the plugin
 * registered here loads with the others, before the server starts, and
 * the check is deferred to an `onReady` hook.
 */
function setUpHttpAdapter(adapterHost: HttpAdapterHost | undefined) {
  const httpAdapter = adapterHost?.httpAdapter;
  if (!httpAdapter) {
    return;
  }
  if (httpAdapter.getType() !== 'fastify') {
    throw new Error(WRONG_ADAPTER_MESSAGE);
  }
  const instance = httpAdapter.getInstance<FastifyInstance>();
  if (verifiedInstances.has(instance)) {
    return;
  }
  const isRegistered = () => instance.hasRequestDecorator('isMultipart');
  try {
    (httpAdapter as unknown as Partial<FastifyAdapter>).useMultipart?.();
    instance.addHook('onReady', async () => {
      if (!isRegistered()) {
        throw new Error(MISSING_PLUGIN_MESSAGE);
      }
    });
  } catch {
    // The instance has already started (e.g. the interceptor was created
    // by a lazy-loaded module): no plugin can be registered any more, and
    // every plugin is loaded.
    if (!isRegistered()) {
      throw new Error(PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE);
    }
  }
  verifiedInstances.add(instance);
}

abstract class MultipartInterceptorHost
  implements NestInterceptor, OnModuleInit
{
  protected readonly options: MultipartOptions;

  constructor(
    moduleOptions: MultipartModuleOptions = {},
    protected readonly adapterHost: HttpAdapterHost | undefined,
    localOptions: MultipartOptions | undefined,
  ) {
    this.options = mergeMultipartOptions(moduleOptions, localOptions);
    if (typeof this.options.limits !== 'function') {
      validateLimits(this.options.limits);
    }
  }

  onModuleInit() {
    setUpHttpAdapter(this.adapterHost);
  }

  abstract intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>>;
}

/**
 * Creates an interceptor that parses the multipart body with multer's
 * semantics, as described by `spec`.
 */
export function createMultipartInterceptor(
  spec: UploadSpec,
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  class MixinInterceptor extends MultipartInterceptorHost {
    // Resolved once per interceptor, as multer does, so that a `dest`
    // folder is created at bootstrap.
    protected readonly storage: MultipartStorageEngine;

    constructor(
      @Optional()
      @Inject(MULTIPART_MODULE_OPTIONS)
      options: MultipartModuleOptions = {},
      @Optional()
      @Inject(HttpAdapterHost)
      adapterHost?: HttpAdapterHost,
    ) {
      super(options, adapterHost, localOptions);
      this.storage = resolveStorage(this.options);
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const req = ctx.getRequest<FastifyRequest>();
      const stopWatching = destroyWhenAnswered(
        req,
        ctx.getResponse<FastifyReply>(),
      );
      let stored: UploadedMultipartFile[];
      try {
        stored = await processMultipart(req, spec, this.options, this.storage);
      } finally {
        stopWatching();
      }
      return next.handle().pipe(
        // When the route's pipes reject the request (e.g. `ParseFilePipe`),
        // the route handler never sees the files, and nothing else would
        // remove them. They are removed once the response has been sent, as
        // an exception filter may still use (or remove) them.
        catchError(err => {
          if (isRejectedByPipes(req)) {
            const reply = ctx.getResponse<FastifyReply>();
            finished(reply.raw, () => {
              removeFiles(this.storage, req, stored).catch(() => undefined);
            });
          }
          return throwError(() => err);
        }),
      );
    }
  }
  return mixin(MixinInterceptor);
}

/**
 * Creates an interceptor that hands the route handler the stream of a single
 * file in `fieldName`.
 */
export function createMultipartStreamInterceptor(
  fieldName: string,
  localOptions?: MultipartOptions,
): Type<NestInterceptor> {
  class MixinInterceptor extends MultipartInterceptorHost {
    constructor(
      @Optional()
      @Inject(MULTIPART_MODULE_OPTIONS)
      options: MultipartModuleOptions = {},
      @Optional()
      @Inject(HttpAdapterHost)
      adapterHost?: HttpAdapterHost,
    ) {
      super(options, adapterHost, localOptions);
    }

    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const ctx = context.switchToHttp();
      const req = ctx.getRequest<FastifyRequest>();
      const reply = ctx.getResponse<FastifyReply>();
      const upload = await processStream(req, fieldName, this.options);
      // Whatever the handler leaves unread is discarded before the response
      // is sent, as multer does: responding while the client is still
      // uploading makes Node.js close the connection under it (EPIPE /
      // ECONNRESET on the client) when it is not kept alive, and leaves a
      // kept-alive connection with an unread body. A StreamableFile
      // response is the exception, as it may be the upload itself, which
      // only drains while the response is sent; what it leaves unread is
      // discarded once the response is out.
      //
      // Discarding detaches the parser from the request, so the stream the
      // handler was given would neither end nor fail any more: it is failed
      // for whoever still reads it, e.g. a handler that a timeout bound
      // earlier answered for, which would otherwise wait for good with the
      // file it writes still open. A request that was read to its end or
      // destroyed is left to the parser, which ends or fails the stream
      // itself, with the actual reason.
      const discardUpload = () => {
        const isDiscarding = !req.raw.readableEnded && !req.raw.destroyed;
        if (upload && !upload.readableEnded && isDiscarding) {
          upload.destroy(new Error(UPLOAD_DISCARDED_MESSAGE));
        }
        return drainRequest(req.raw);
      };
      if (reply.raw.writableFinished || reply.raw.destroyed) {
        // Answered while the body was being parsed (e.g. by Fastify's
        // `handlerTimeout`): 'close' may have been emitted already.
        void discardUpload();
      } else {
        reply.raw.once('close', () => void discardUpload());
      }
      const drainBefore = <T>(result: T) =>
        from(discardUpload().then(() => result));
      return next.handle().pipe(
        concatMap(result =>
          result instanceof StreamableFile ? [result] : drainBefore(result),
        ),
        catchError(err =>
          drainBefore(undefined).pipe(concatMap(() => throwError(() => err))),
        ),
      );
    }
  }
  return mixin(MixinInterceptor);
}
