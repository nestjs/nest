import { Type } from '../type.interface';
import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';
export interface MiddlewareConsumer {
    /**
     * Takes either middleware class/function or array of classes/functions
     * that subsequently shall be attached to the passed routes.
     *
     * @param  {any|any[]} middleware
     * @returns {MiddlewareConfigProxy}
     */
    apply(...middleware: (Type<any> | Function)[]): MiddlewareConfigProxy;
}
