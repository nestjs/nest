import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller } from '@nestjs/common/interfaces';
import { RouteParamsMetadata } from '@nestjs/common/utils';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';

export interface IndexValuePair {
    index: number;
    value: any;
}

export class RouterExecutionContext {
    constructor(private paramsFactory: IRouteParamsFactory) {}

    public create(instance: Controller, callback: (...args) => any) {
        const metadata = this.reflectCallbackMetadata(instance, callback);
        if (isUndefined(metadata)) {
            return callback.bind(instance);
        }
        const keys = Object.keys(metadata);
        const argsLength = this.getArgumentsLength(keys, metadata);
        const args = this.createNullArray(argsLength);

        return (req, res, next) => {
            const indexValuePairs = this.exchangeKeysForValues(keys, metadata, { req, res, next });
            indexValuePairs.forEach(pair => args[pair.index] = pair.value);
            return callback.apply(instance, args);
        };
    }

    public mapParamType(key: string): RouteParamtypes {
        const keyPair = key.split(':');
        return Number(keyPair[0]);
    }

    public reflectCallbackMetadata(instance: Controller, callback: (...args) => any): RouteParamsMetadata {
        return Reflect.getMetadata(ROUTE_ARGS_METADATA, instance, callback.name);
    }

    public getArgumentsLength(keys: string[], metadata: RouteParamsMetadata): number {
        return Math.max(...keys.map(key => metadata[key].index)) + 1;
    }

    public createNullArray(length: number): any[] {
        return Array.apply(null, { length }).fill(null);
    }

    public exchangeKeysForValues(keys: string[], metadata: RouteParamsMetadata, { req, res, next }): IndexValuePair[] {
        return keys.map(key => ({
            index: metadata[key].index,
            value: this.paramsFactory.exchangeKeyForValue(
                this.mapParamType(key),
                metadata[key].data,
                { req, res, next },
            ),
        }));
    } 
}