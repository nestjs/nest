import { Observable } from 'rxjs';
import { ExecutionContext } from './execution-context.interface';
import { RenderInterceptorExecutionContext } from './render-interceptor_execution_context.interface';

/**
 * Interface providing access to the response stream.
 *
 * @see [Interceptors](https://docs.nestjs.com/interceptors)
 *
 * @publicApi
 */
export interface CallHandler<T = any> {
  /**
   * Returns an `Observable` reprsenting the response stream from the route
   * handler.
   */
  handle(): Observable<T>;
}

/**
 * Interface describing implementation of an interceptor.
 * Implement intercept and/or renderIntercept
 * @see [Interceptors](https://docs.nestjs.com/interceptors)
 *
 * @publicApi
 */

export interface NestInterceptor<T = any, R = any> {
  /**
   * Method to intercept return value of route handler.
   *
   * @param context an `ExecutionContext` object providing methods to access the
   * route handler and class about to be invoked.
   * @param next a reference to the `CallHandler`, which provides access to an
   * `Observable` representing the response stream from the route handler.
   * @param didRender set rendered property to false to skip normal rendering
   * processing that would be applied when render decorator is present on route method
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<R> | Promise<Observable<R>>;
}

/**
 * Interface describing implementation of a route interceptor.
 * @see [Interceptors](https://docs.nestjs.com/interceptors)
 *
 * @publicApi
 */

export interface DidRender {
  rendered: boolean;
}
export interface NestRouterInterceptor<T = any, R = any> {
  /**
   * Method to intercept return value of route handler.
   *
   * @param context an `ExecutionContext` object providing methods to access the
   * route handler and class about to be invoked.
   * @param next a reference to the `CallHandler`, which provides access to an
   * `Observable` representing the response stream from the route handler.
   * @param didRender set rendered property to false to skip normal rendering
   * processing that would be applied when render decorator is present on route method
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
    didRender: { rendered: boolean },
  ): Observable<R> | Promise<Observable<R>>;
}

/**
 * An interceptor that can intercept renders that occur from
 * the use of the render decorator.
 * Note that the presence of an intercept property will
 * be interpreted as a normal interceptor
 */
export interface NestRouterRenderInterceptor {
  /**
   * Method to intercept rendering applied with the Render decorator
   *
   * @param context a `RenderInterceptorExecutionContext` object providing methods to access the
   * route handler and class about to be invoked.
   * @param next a reference to the `CallHandler`, which provides access to an
   * `Observable` representing the response stream from the route handler.
   */
  renderIntercept(
    context: RenderInterceptorExecutionContext,
    next: CallHandler<string>,
  ): Observable<string> | Promise<Observable<string>>;
}
export type NestInterceptorType = NestInterceptor | NestRouterInterceptor;
export type AnyNestInterceptor =
  | NestInterceptorType
  | NestRouterRenderInterceptor;
