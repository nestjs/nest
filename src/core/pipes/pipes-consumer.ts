import { Transform, Paramtype } from '@nestjs/common/interfaces';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { ParamsTokenFactory } from './../pipes/params-token-factory';

export class PipesConsumer {
    private readonly paramsTokenFactory = new ParamsTokenFactory();

    public async apply(value, { metatype, type, data }, transforms: Transform<any>[]) {
        const token = this.paramsTokenFactory.exchangeEnumForString(type);
        return await transforms.reduce(async (defferedValue, fn) => {
            const val = await defferedValue;
            const result = fn(val, { metatype, type: token, data });
            if (result instanceof Promise) {
                return result;
            }
            return Promise.resolve(result);
        }, Promise.resolve(value));
    }
}