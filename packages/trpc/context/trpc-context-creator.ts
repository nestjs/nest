import {
  ContextType,
  ForbiddenException,
  HttpException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller } from '@nestjs/common/interfaces';
import { ExternalExceptionFilterContext } from '@nestjs/core/exceptions/external-exception-filter-context';
import { ExternalExceptionsHandler } from '@nestjs/core/exceptions/external-exceptions-handler';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { TRPCError, TRPC_ERROR_CODE_KEY } from '@trpc/server';
import { isObservable, lastValueFrom } from 'rxjs';
import { TRPC_PARAM_ARGS_METADATA } from '../constants';
import { TrpcParamMetadata } from '../decorators/param-metadata.util';
import { TrpcParamtype } from '../enums';

const TRPC_CONTEXT_TYPE: ContextType = 'rpc';

interface TrpcHandlerOptions {
  callback: (...args: any[]) => any;
  methodName: string;
  moduleKey: string;
  paramTypes?: unknown[];
  inquirerId?: string;
  resolveContextId?: () => { id: number };
  resolveInstance: (contextId: { id: number }) => Promise<Controller>;
}

/**
 * Creates execution-context-aware wrappers for tRPC procedure handlers.
 *
 * Integrates NestJS guards, interceptors, pipes, and exception filters
 * into the tRPC request lifecycle, mirroring Nest external context handling.
 *
 * @internal
 */
@Injectable()
export class TrpcContextCreator {
  constructor(
    private readonly guardsContextCreator: GuardsContextCreator,
    private readonly guardsConsumer: GuardsConsumer,
    private readonly interceptorsContextCreator: InterceptorsContextCreator,
    private readonly interceptorsConsumer: InterceptorsConsumer,
    private readonly pipesContextCreator: PipesContextCreator,
    private readonly pipesConsumer: PipesConsumer,
    private readonly exceptionFiltersContext: ExternalExceptionFilterContext,
  ) {}

  /**
   * Backward-compatible overload for existing unit tests and internal callers.
   */
  create(
    instance: Controller,
    callback: (...args: any[]) => any,
    moduleKey: string,
    contextId?: { id: number },
    inquirerId?: string,
  ): (input: unknown, ctx: unknown) => Promise<unknown>;

  /**
   * Preferred overload used by TrpcRouter for request-scoped resolution.
   */
  create(
    options: TrpcHandlerOptions,
  ): (input: unknown, ctx: unknown) => Promise<unknown>;

  create(
    instanceOrOptions: Controller | TrpcHandlerOptions,
    callback?: (...args: any[]) => any,
    moduleKey?: string,
    contextId: { id: number } = STATIC_CONTEXT,
    inquirerId?: string,
  ): (input: unknown, ctx: unknown) => Promise<unknown> {
    if (typeof callback === 'function' && moduleKey !== undefined) {
      const instance = instanceOrOptions as Controller;
      return this.createHandler({
        callback,
        methodName: callback.name,
        moduleKey,
        inquirerId,
        resolveContextId: () => contextId,
        resolveInstance: async () => instance,
      });
    }

    return this.createHandler(instanceOrOptions as TrpcHandlerOptions);
  }

  private createHandler(
    options: TrpcHandlerOptions,
  ): (input: unknown, ctx: unknown) => Promise<unknown> {
    const paramMetadata: TrpcParamMetadata[] =
      Reflect.getMetadata(TRPC_PARAM_ARGS_METADATA, options.callback) ?? [];
    const paramTypes = options.paramTypes ?? [];

    return async (input: unknown, trpcCtx: unknown) => {
      const currentContextId = options.resolveContextId?.() ?? STATIC_CONTEXT;
      const instance = await options.resolveInstance(currentContextId);
      const callbackCandidate =
        (instance as Record<string, unknown>)[options.methodName] ??
        options.callback;

      if (typeof callbackCandidate !== 'function') {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Unable to resolve tRPC handler "${options.methodName}"`,
        });
      }
      const callback = callbackCandidate as (...args: any[]) => any;

      const guards = this.guardsContextCreator.create(
        instance,
        callback,
        options.moduleKey,
        currentContextId,
        options.inquirerId,
      );
      const interceptors = this.interceptorsContextCreator.create(
        instance,
        callback,
        options.moduleKey,
        currentContextId,
        options.inquirerId,
      );
      const pipes = this.pipesContextCreator.create(
        instance,
        callback,
        options.moduleKey,
        currentContextId,
        options.inquirerId,
      );
      const exceptionHandler = this.exceptionFiltersContext.create(
        instance,
        callback as any,
        options.moduleKey,
        currentContextId,
        options.inquirerId,
      );

      const contextArgs = [input, trpcCtx];
      const executionContext = new ExecutionContextHost(
        contextArgs,
        instance.constructor as any,
        callback,
      );
      executionContext.setType(TRPC_CONTEXT_TYPE);

      try {
        if (guards.length) {
          const canActivate = await this.guardsConsumer.tryActivate(
            guards,
            contextArgs,
            instance,
            callback,
            TRPC_CONTEXT_TYPE,
          );
          if (!canActivate) {
            throw new ForbiddenException('Forbidden');
          }
        }

        const handler = async () => {
          const handlerArgs = this.resolveHandlerArgs(
            input,
            trpcCtx,
            paramMetadata,
          );
          if (pipes.length) {
            await this.applyPipes(
              handlerArgs,
              pipes,
              paramMetadata,
              paramTypes,
            );
          }
          return callback.call(instance, ...handlerArgs);
        };

        const result =
          interceptors.length > 0
            ? await this.interceptorsConsumer.intercept(
                interceptors,
                contextArgs,
                instance,
                callback,
                handler,
                TRPC_CONTEXT_TYPE,
              )
            : await handler();

        return this.transformToResult(result);
      } catch (error) {
        return this.handleException(error, exceptionHandler, executionContext);
      }
    };
  }

  private async handleException(
    error: unknown,
    exceptionHandler: ExternalExceptionsHandler,
    executionContext: ExecutionContextHost,
  ): Promise<unknown> {
    try {
      return await exceptionHandler.next(error as Error, executionContext);
    } catch (filteredError) {
      throw this.toTrpcError(filteredError);
    }
  }

  private async applyPipes(
    args: unknown[],
    pipes: PipeTransform[],
    metadata: TrpcParamMetadata[],
    paramTypes: unknown[],
  ): Promise<void> {
    const targets = this.getPipeTargets(metadata);
    for (const target of targets) {
      args[target.index] = await this.pipesConsumer.apply(
        args[target.index],
        {
          type: RouteParamtypes.BODY as any,
          metatype: paramTypes[target.index] as any,
          data: target.data,
        },
        pipes,
      );
    }
  }

  private getPipeTargets(
    metadata: TrpcParamMetadata[],
  ): Array<{ index: number; data?: string }> {
    if (!metadata.length) {
      return [{ index: 0 }];
    }
    return metadata
      .filter(param => param.type === TrpcParamtype.INPUT)
      .map(param => ({ index: param.index, data: param.data }));
  }

  private resolveHandlerArgs(
    input: unknown,
    trpcCtx: unknown,
    metadata: TrpcParamMetadata[],
  ): unknown[] {
    if (!metadata.length) {
      return [input, trpcCtx];
    }

    const size = Math.max(...metadata.map(param => param.index)) + 1;
    const args = new Array<unknown>(size).fill(undefined);

    for (const param of metadata) {
      args[param.index] = this.extractParamValue(param, input, trpcCtx);
    }
    return args;
  }

  private extractParamValue(
    param: TrpcParamMetadata,
    input: unknown,
    trpcCtx: unknown,
  ): unknown {
    if (param.type === TrpcParamtype.INPUT) {
      return this.pickField(input, param.data);
    }
    return this.pickField(trpcCtx, param.data);
  }

  private pickField(value: unknown, field?: string): unknown {
    if (!field) {
      return value;
    }
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    return (value as Record<string, unknown>)[field];
  }

  private async transformToResult(resultOrDeferred: unknown): Promise<unknown> {
    if (isObservable(resultOrDeferred)) {
      return lastValueFrom(resultOrDeferred);
    }
    return resultOrDeferred;
  }

  private toTrpcError(error: unknown): TRPCError {
    if (error instanceof TRPCError) {
      return error;
    }

    if (error instanceof HttpException) {
      return new TRPCError({
        code: this.mapHttpStatusToTrpcCode(error.getStatus()),
        message: this.extractHttpExceptionMessage(error),
        cause: error,
      });
    }

    if (error instanceof Error) {
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
        cause: error,
      });
    }

    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      cause: error,
    });
  }

  private extractHttpExceptionMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (
      response &&
      typeof response === 'object' &&
      'message' in response &&
      response.message
    ) {
      if (Array.isArray(response.message)) {
        return response.message.join(', ');
      }
      if (typeof response.message === 'string') {
        return response.message;
      }
    }
    return exception.message;
  }

  private mapHttpStatusToTrpcCode(status: number): TRPC_ERROR_CODE_KEY {
    const codeByStatus: Partial<Record<number, TRPC_ERROR_CODE_KEY>> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      402: 'PAYMENT_REQUIRED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_SUPPORTED',
      408: 'TIMEOUT',
      409: 'CONFLICT',
      412: 'PRECONDITION_FAILED',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_CONTENT',
      428: 'PRECONDITION_REQUIRED',
      429: 'TOO_MANY_REQUESTS',
      499: 'CLIENT_CLOSED_REQUEST',
      501: 'NOT_IMPLEMENTED',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return codeByStatus[status] ?? 'INTERNAL_SERVER_ERROR';
  }
}
