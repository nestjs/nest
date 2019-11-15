import { ContextType, NestRouterRenderInterceptor } from '@nestjs/common';
import {
  Controller,
  DidRender,
  NestInterceptorType,
  AnyNestInterceptor,
} from '@nestjs/common/interfaces';
import { InterceptorsConsumer } from './interceptors-consumer';
import { RouterRenderInterceptorsConsumer } from './router-render-interceptors-consumer';

export class RouterInterceptorsConsumer {
  private readonly interceptorsConsumer: InterceptorsConsumer;
  private readonly interceptDidRenderedArg: DidRender = { rendered: false };
  constructor(
    interceptorsConsumer: InterceptorsConsumer = new InterceptorsConsumer(),
    private readonly renderInterceptorsConsumer: RouterRenderInterceptorsConsumer = new RouterRenderInterceptorsConsumer(),
  ) {
    this.interceptorsConsumer = interceptorsConsumer;
    this.interceptorsConsumer.filterInterceptors = false;
    this.interceptorsConsumer.didRender = this.interceptDidRenderedArg;
  }
  private renderInterceptors: NestRouterRenderInterceptor[];
  private handlerInterceptors: NestInterceptorType[];
  private readonly contextType: ContextType = 'http';
  private mapInterceptors(interceptors: AnyNestInterceptor[]) {
    this.handlerInterceptors = [];
    this.renderInterceptors = [];
    interceptors.forEach(interceptor => {
      if ((interceptor as NestInterceptorType).intercept) {
        this.handlerInterceptors.push(interceptor as NestInterceptorType);
      } else {
        this.renderInterceptors.push(
          interceptor as NestRouterRenderInterceptor,
        );
      }
    });
  }
  private shouldSkipRender() {
    const skipRender = this.interceptDidRenderedArg.rendered;
    this.interceptDidRenderedArg.rendered = false;
    return skipRender;
  }
  public async interceptHandlerResponse(
    interceptors: AnyNestInterceptor[],
    args: any[],
    instance: Controller,
    callback: (...args: any[]) => any,
    next: () => Promise<any>,
  ) {
    this.mapInterceptors(interceptors);

    const result = await this.interceptorsConsumer.intercept(
      this.handlerInterceptors,
      args,
      instance,
      callback,
      next,
      this.contextType,
    );
    this.renderInterceptorsConsumer.prepare(
      this.renderInterceptors,
      args,
      instance,
      callback,
    );
    return {
      skipRender: this.shouldSkipRender(),
      result,
    };
  }
  public canRenderIntercept() {
    return this.renderInterceptors.length > 0;
  }
  public renderIntercept(renderedView: string) {
    return this.renderInterceptorsConsumer.renderIntercept(renderedView);
  }
}
