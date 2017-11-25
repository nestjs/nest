import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Paramtype } from '@nestjs/common';
export declare class ParamsTokenFactory {
    exchangeEnumForString(type: RouteParamtypes): Paramtype;
}
