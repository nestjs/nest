import { ApplicationConfig } from './../application-config';
import { IRouteCustomParamsFactory } from './interfaces/route-custom-params-factory.interface';

export class RouteCustomParamsFactory implements IRouteCustomParamsFactory {
  constructor(private readonly config?: ApplicationConfig) {}

  public exchangeKeyForValue(paramtype, data, { req, res, next }) {
    const customParamDecorators = this.config && this.config.getCustomParamDecorators();
    if (customParamDecorators) {
      const decorator = customParamDecorators.find((one) => one.paramtype === paramtype);
      if (decorator && decorator.reflector) {
        try {
          return decorator.reflector(data, req, res, next);
        } catch (error) {
          return null;
        }
      }

      return null;
    }

    return null;
  }
}