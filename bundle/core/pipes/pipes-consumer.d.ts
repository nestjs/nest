import { Transform } from '@nestjs/common/interfaces';
export declare class PipesConsumer {
    private readonly paramsTokenFactory;
    apply(value: any, {metatype, type, data}: {
        metatype: any;
        type: any;
        data: any;
    }, transforms: Transform<any>[]): Promise<any>;
    applyPipes(value: any, {metatype, type, data}: {
        metatype;
        type?;
        data?;
    }, transforms: Transform<any>[]): Promise<any>;
}
