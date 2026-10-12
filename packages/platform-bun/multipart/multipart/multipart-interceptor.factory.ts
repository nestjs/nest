import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  mixin,
  type NestInterceptor,
  type OnModuleInit,
  Optional,
  type Type,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Observable } from 'rxjs';
import type { BunRequest } from '../../adapters/bun-request.js';
import { MULTIPART_MODULE_OPTIONS } from '../files.constants.js';
import type {
  MultipartModuleOptions,
  MultipartOptions,
  MultipartStorageEngine,
} from '../interfaces/index.js';
import { WRONG_ADAPTER_MESSAGE } from './multipart.constants.js';
import {
  processMultipart,
  processStream,
  resolveStorage,
  type UploadSpec,
  validateLimits,
} from './multipart.parser.js';
import { mergeMultipartOptions } from './multipart.utils.js';

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
    const httpAdapter = this.adapterHost?.httpAdapter;
    if (httpAdapter && httpAdapter.getType() !== 'bun') {
      throw new Error(WRONG_ADAPTER_MESSAGE);
    }
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
      const req = context.switchToHttp().getRequest<BunRequest>();
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
      const req = context.switchToHttp().getRequest<BunRequest>();
      await processStream(req, fieldName, this.options);
      return next.handle();
    }
  }
  return mixin(MixinInterceptor);
}
