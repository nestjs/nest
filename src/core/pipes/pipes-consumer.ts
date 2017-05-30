import { Transform, Paramtype } from '@nestjs/common/interfaces';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { ParamsTokenFactory } from './../pipes/params-token-factory';

export class PipesConsumer {
    private readonly paramsTokenFactory = new ParamsTokenFactory();

    public apply(value, metatype, type: RouteParamtypes, transforms: Transform<any>[]) {
        const token = this.paramsTokenFactory.exchangeEnumForString(type);
        return transforms.reduce((val, fn) => fn(val, metatype, token), value);
    }
}