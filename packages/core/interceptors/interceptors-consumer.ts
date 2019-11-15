import {
  Controller,
  ContextType,
  NestInterceptorType,
  AnyNestInterceptor,
  DidRender,
} from '@nestjs/common/interfaces';
import { InterceptorsConsumerLogic } from './interceptors-consumer-logic';

export class InterceptorsConsumer {
  didRender: DidRender | undefined;
  constructor(
    private readonly interceptorsConsumerLogic: InterceptorsConsumerLogic = new InterceptorsConsumerLogic(),
  ) {}
  public filterInterceptors = true;
  async intercept<TContext extends ContextType = ContextType>(
    interceptors: AnyNestInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
    next: () => Promise<any>,
    type?: TContext,
  ) {
    let nestInterceptors: NestInterceptorType[];
    if (this.filterInterceptors) {
      interceptors = interceptors.filter(
        interceptor => !!(interceptor as NestInterceptorType).intercept,
      );
    }
    nestInterceptors = interceptors as NestInterceptorType[];

    return this.interceptorsConsumerLogic.intercept(
      executionContext => executionContext,
      (interceptor, executionContext, callHandler) => {
        return interceptor.intercept(
          executionContext,
          callHandler,
          this.didRender,
        );
      },
      nestInterceptors,
      args,
      instance,
      callback,
      next,
      type,
    );
  }
}
