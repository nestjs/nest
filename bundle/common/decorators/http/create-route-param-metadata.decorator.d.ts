import { PipeTransform } from '../../index';
import { Type } from '../../interfaces';
import { CustomParamFactory } from '../../interfaces/features/custom-route-param-factory.interface';
export declare type ParamDecoratorEnhancer = ParameterDecorator;
/**
 * Defines HTTP route param decorator
 * @param factory
 */
export declare function createParamDecorator(factory: CustomParamFactory, enhancers?: ParamDecoratorEnhancer[]): (...dataOrPipes: (Type<PipeTransform> | PipeTransform | any)[]) => ParameterDecorator;
/**
 * Defines HTTP route param decorator
 * @deprecated
 * @param factory
 */
export declare function createRouteParamDecorator(factory: CustomParamFactory): (data?: any, ...pipes: (Type<PipeTransform> | PipeTransform)[]) => ParameterDecorator;
