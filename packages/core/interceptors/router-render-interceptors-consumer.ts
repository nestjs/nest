import { NestRouterRenderInterceptor } from '@nestjs/common';
import { Controller } from '@nestjs/common/interfaces';
import {
  RenderInterceptorExecutionContextFactory,
  renderInterceptorExecutionContextFactory,
} from './render-interceptor-executioncontext';
import { InterceptorsConsumerLogic } from './interceptors-consumer-logic';

export class RouterRenderInterceptorsConsumer {
  private renderInterceptors: NestRouterRenderInterceptor[];
  private args: any[];
  private instance: Controller;
  private callback: (...args: any[]) => any;

  constructor(
    private readonly interceptorsConsumerLogic: InterceptorsConsumerLogic = new InterceptorsConsumerLogic(),
    private readonly executionContextFactory: RenderInterceptorExecutionContextFactory = renderInterceptorExecutionContextFactory,
  ) {}
  prepare(
    interceptors: NestRouterRenderInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
  ) {
    this.renderInterceptors = interceptors;
    this.args = args;
    this.instance = instance;
    this.callback = callback;
  }
  renderIntercept(renderedView: string) {
    return this.interceptorsConsumerLogic.intercept(
      executionContext => this.executionContextFactory(executionContext),
      (interceptor, renderExecutionContext, callHandler) => {
        return interceptor.renderIntercept(renderExecutionContext, callHandler);
      },
      this.renderInterceptors,
      this.args,
      this.instance,
      this.callback,
      () => Promise.resolve(renderedView),
    );
  }
}
