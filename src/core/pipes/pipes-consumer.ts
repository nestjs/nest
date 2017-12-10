import { ArgumentMetadata, Paramtype, Transform } from '@nestjs/common/interfaces';

import { ParamsTokenFactory } from './../pipes/params-token-factory';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';

export class PipesConsumer {
    private readonly paramsTokenFactory = new ParamsTokenFactory();

    public async apply(
        value: any,
        { metatype, type, data }: { metatype: ArgumentMetadata['metatype'], type: RouteParamtypes, data: string },
        transforms: Transform<any>[]) {
        const token = this.paramsTokenFactory.exchangeEnumForString(type);
        return await this.applyPipes(value, { metatype, type: token, data }, transforms);
    }

    public async applyPipes(value: any, { metatype, type, data }: ArgumentMetadata, transforms: Transform<any>[]) {
        return await transforms.reduce(async (defferedValue, fn) => {
            const val = await defferedValue;
            const result = fn(val, { metatype, type, data });
            if (result instanceof Promise) {
                return result;
            }
            return Promise.resolve(result);
        }, Promise.resolve(value));
    }
}
