import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
/**
 * Creates HTTP route param decorator
 * @param factory
 */
export declare function createParamDecorator(factory: CustomParamFactory): (data?: any, ...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator;
/**
 * Creates HTTP route param decorator
 * @deprecated
 * @param factory
 */
export declare function createRouteParamDecorator(factory: CustomParamFactory): (data?: any, ...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator;
