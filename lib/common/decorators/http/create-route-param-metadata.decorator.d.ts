import { CustomParamFactory } from '../../interfaces/custom-route-param-factory.interface';
import { PipeTransform } from '../../index';
/**
 * Create route params custom decorator
 * @param factory
 */
export declare function createRouteParamDecorator(factory: CustomParamFactory): (data?: any, ...pipes: PipeTransform<any>[]) => ParameterDecorator;
