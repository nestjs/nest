import {
  CanActivate,
  ContextType,
  ForbiddenException,
  Injectable,
  NestInterceptor,
  PipeTransform,
} from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';
import { GuardsContextCreator } from '@nestjs/core/guards/guards-context-creator';
import { InterceptorsConsumer } from '@nestjs/core/interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '@nestjs/core/interceptors/interceptors-context-creator';
import { PipesConsumer } from '@nestjs/core/pipes/pipes-consumer';
import { PipesContextCreator } from '@nestjs/core/pipes/pipes-context-creator';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';

const TRPC_CONTEXT_TYPE: ContextType = 'rpc';

/**
 * Creates execution-context-aware wrappers for tRPC procedure handlers.
 *
 * Integrates NestJS guards, interceptors, and pipes into the tRPC
 * request lifecycle, mirroring the pattern used by `RpcContextCreator`
 * in `@nestjs/microservices`.
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
  ) {}

  /**
   * Wraps a procedure handler method so that guards, interceptors, and pipes
   * execute before and around the actual handler invocation.
   */
  create(
    instance: Controller,
    callback: (...args: any[]) => any,
    moduleKey: string,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ): (input: unknown, ctx: unknown) => Promise<unknown> {
    const guards = this.guardsContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
    );

    const interceptors = this.interceptorsContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
    );

    const pipes = this.pipesContextCreator.create(
      instance,
      callback,
      moduleKey,
      contextId,
      inquirerId,
    );

    return async (input: unknown, trpcCtx: unknown) => {
      const args = [input, trpcCtx];
      const executionContext = new ExecutionContextHost(
        args,
        instance.constructor as any,
        callback,
      );
      executionContext.setType(TRPC_CONTEXT_TYPE);

      // Guards
      if (guards.length) {
        const canActivate = await this.guardsConsumer.tryActivate(
          guards,
          args,
          instance,
          callback,
          TRPC_CONTEXT_TYPE,
        );
        if (!canActivate) {
          throw new ForbiddenException();
        }
      }

      // Interceptors wrapping the handler
      const handler = async () => {
        let transformedInput = input;
        // Pipes — transform input before passing to handler
        if (pipes.length) {
          transformedInput = await this.applyPipes(input, pipes);
        }
        return callback.call(instance, transformedInput, trpcCtx);
      };

      if (interceptors.length) {
        return this.interceptorsConsumer.intercept(
          interceptors,
          args,
          instance,
          callback,
          handler,
          TRPC_CONTEXT_TYPE,
        );
      }
      return handler();
    };
  }

  private async applyPipes(
    value: unknown,
    pipes: PipeTransform[],
  ): Promise<unknown> {
    let result = value;
    for (const pipe of pipes) {
      result = await pipe.transform(result, {
        type: 'body',
        metatype: undefined,
        data: undefined,
      });
    }
    return result;
  }
}
