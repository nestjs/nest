import { CustomParamFactory } from '../../interfaces/custom-route-param-factory.interface';
import { ParamData } from './route-params.decorator';
/**
 * Create route params custom decorator
 * @param factory
 */
export declare const createRouteParamDecorator: (factory: CustomParamFactory) => (data?: ParamData) => ParameterDecorator;
