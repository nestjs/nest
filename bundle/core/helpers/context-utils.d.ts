import { ParamData } from '@nestjs/common';
import { Controller, PipeTransform } from '@nestjs/common/interfaces';
export interface ParamProperties<T = any, IExtractor extends Function = any> {
    index: number;
    type: T | string;
    data: ParamData;
    pipes: PipeTransform[];
    extractValue: IExtractor;
}
export declare class ContextUtils {
    mapParamType(key: string): string;
    reflectCallbackParamtypes(instance: Controller, methodName: string): any[];
    reflectCallbackMetadata<T = any>(instance: Controller, methodName: string, metadataKey: string): T;
    getArgumentsLength<T>(keys: string[], metadata: T): number;
    createNullArray(length: number): any[];
    mergeParamsMetatypes(paramsProperties: ParamProperties[], paramtypes: any[]): (ParamProperties & {
        metatype?: any;
    })[];
}
