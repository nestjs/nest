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
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { catchError, concatMap, from, type Observable, throwError } from 'rxjs';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants.js';
import type {
  MultipartModuleOptions,
  MultipartOptions,
  MultipartStorageEngine,
} from '../interfaces/index.js';
import {
  MISSING_PLUGIN_MESSAGE,
  PLUGIN_NOT_REGISTERED_AT_STARTUP_MESSAGE,
  WRONG_ADAPTER_MESSAGE,
} from './multipart.constants.js';
import {
  drainRequest,
  processMultipart,
  processStream,
  resolveStorage,
  type UploadSpec,
  validateLimits,
} from './multipart.parser.js';
import { mergeMultipartOptions } from './multipart.utils.js';
import type { FastifyAdapter } from '../../adapters/fastify-adapter.js';

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
      const req = context.switchToHttp().getRequest<FastifyRequest>();
      await processMultipart(req, spec, this.options, this.storage);
      return next.handle();
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
      await processStream(req, fieldName, this.options);
      // Whatever the handler leaves unread is discarded before the response
      // is sent, as multer does: responding while the client is still
      // uploading makes Node.js close the connection under it (EPIPE /
      // ECONNRESET on the client) when it is not kept alive, and leaves a
      // kept-alive connection with an unread body. A StreamableFile
      // response is the exception, as it may be the upload itself, which
      // only drains while the response is sent; what it leaves unread is
      // discarded once the response is out.
      reply.raw.once('close', () => void drainRequest(req.raw));
      const drainBefore = <T>(result: T) =>
        from(drainRequest(req.raw).then(() => result));
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
