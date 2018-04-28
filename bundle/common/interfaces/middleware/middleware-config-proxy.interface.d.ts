import { MiddlewareConsumer } from './middleware-consumer.interface';
import { Type } from '../type.interface';
export interface MiddlewareConfigProxy {
    /**
     * Passes custom arguments to `resolve()` method of the middleware.
     *
     * @param  {} ...data
     * @returns {MiddlewareConfigProxy}
     */
    with(...data: any[]): MiddlewareConfigProxy;
    /**
     * Attaches passed either routes (strings) or controllers to the processed middleware(s).
     * When you pass Controller class Nest will attach middleware to every path defined within this controller.
     *
     * @param  {} ...routes
     * @returns {MiddlewareConsumer}
     */
    forRoutes(...routes: (string | Type<any>)[]): MiddlewareConsumer;
}
