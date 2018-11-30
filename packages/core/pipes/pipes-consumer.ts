import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { ArgumentMetadata, Transform } from '@nestjs/common/interfaces';
import { ParamsTokenFactory } from './params-token-factory';

export class PipesConsumer {
  private readonly paramsTokenFactory = new ParamsTokenFactory();

  public async apply<TInput = any>(
    value: TInput,
    { metatype, type, data }: ArgumentMetadata,
    transforms: Transform<any>[],
  ) {
    const token = this.paramsTokenFactory.exchangeEnumForString(
      (type as any) as RouteParamtypes,
    );
    return this.applyPipes(value, { metatype, type: token, data }, transforms);
  }

  public async applyPipes<TInput = any>(
    value: TInput,
    { metatype, type, data }: { metatype: any; type?: any; data?: any },
    transforms: Transform<any>[],
  ) {
    return transforms.reduce(async (defferedValue, fn) => {
      const val = await defferedValue;
      const result = fn(val, { metatype, type, data });
      return result;
    }, Promise.resolve(value));
  }
}
