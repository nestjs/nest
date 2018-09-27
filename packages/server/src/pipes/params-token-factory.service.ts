import { Injectable } from '@nest/core';

import { Paramtype } from '../interfaces';
import { RouteParamtypes } from '../enums';

@Injectable()
export class ParamsTokenFactory {
  public exchangeEnumForString(type: keyof RouteParamtypes): Paramtype {
    switch (type) {
      case RouteParamtypes.BODY:
        return 'body';
      case RouteParamtypes.PARAM:
        return 'param';
      case RouteParamtypes.QUERY:
        return 'query';
      default:
        return 'custom';
    }
  }
}
