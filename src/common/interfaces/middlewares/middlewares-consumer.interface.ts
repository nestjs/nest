import { Metatype } from '../metatype.interface';
import { MiddlewareConfigProxy } from './middleware-config-proxy.interface';

export interface MiddlewaresConsumer {
     apply(metatypes: Metatype<any> | Array<Metatype<any>>): MiddlewareConfigProxy;
}