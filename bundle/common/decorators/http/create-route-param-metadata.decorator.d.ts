import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
/**
 * Defines HTTP route param decorator
 * @param factory
 */
export declare function createParamDecorator(factory: CustomParamFactory): (data?: any, ...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator;
/**
 * Defines HTTP route param decorator
 * @deprecated
 * @param factory
 */
export declare function createRouteParamDecorator(factory: CustomParamFactory): (data?: any, ...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator;
