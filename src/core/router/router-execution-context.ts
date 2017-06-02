import 'reflect-metadata';
import { ROUTE_ARGS_METADATA, PARAMTYPES_METADATA } from '@nestjs/common/constants';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { RouteParamsMetadata } from '@nestjs/common/utils';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import { PipesContextCreator } from './../pipes/pipes-context-creator';
import { PipesConsumer } from './../pipes/pipes-consumer';
import { ParamData } from '@nestjs/common';

export interface ParamProperties {
    index: number;
    value: any;
    type: RouteParamtypes;
    data: ParamData;
}

export class RouterExecutionContext {
    constructor(
        private readonly paramsFactory: IRouteParamsFactory,
        private readonly pipesContextCreator: PipesContextCreator,
        private readonly pipesConsumer: PipesConsumer) {}

    public create(instance: Controller, callback: (...args) => any) {
        const metadata = this.reflectCallbackMetadata(instance, callback);
        if (isUndefined(metadata)) {
            return callback.bind(instance);
        }
        const keys = Object.keys(metadata);
        const argsLength = this.getArgumentsLength(keys, metadata);
        const args = this.createNullArray(argsLength);
        const pipes = this.pipesContextCreator.create(instance, callback);
        const paramtypes = this.reflectCallbackParamtypes(instance, callback);

        return async (req, res, next) => {
            const paramProperties = this.exchangeKeysForValues(keys, metadata, { req, res, next });
            for (const param of paramProperties) {
                const { index, value, type, data } = param;
                args[index] = await this.getParamValue(value, { metatype: paramtypes[index], type, data }, pipes);
            }
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

    public reflectCallbackParamtypes(instance: Controller, callback: (...args) => any): any[] {
        return Reflect.getMetadata(PARAMTYPES_METADATA, instance, callback.name);
    }

    public getArgumentsLength(keys: string[], metadata: RouteParamsMetadata): number {
        return Math.max(...keys.map(key => metadata[key].index)) + 1;
    }

    public createNullArray(length: number): any[] {
        return Array.apply(null, { length }).fill(null);
    }

    public exchangeKeysForValues(keys: string[], metadata: RouteParamsMetadata, { req, res, next }): ParamProperties[] {
        return keys.map(key => {
            const type = this.mapParamType(key);
            return {
                index: metadata[key].index,
                value: this.paramsFactory.exchangeKeyForValue(
                    type,
                    metadata[key].data,
                    { req, res, next },
                ),
                type,
                data: metadata[key].data,
            };
        });
    }

    public async getParamValue<T>(
        value: T,
        { metatype, type, data },
        transforms: Transform<any>[]): Promise<any> {

        if (type === RouteParamtypes.BODY
            || type === RouteParamtypes.QUERY
            || type === RouteParamtypes.PARAM) {

            return await this.pipesConsumer.apply(value, { metatype, type, data }, transforms);
        }
        return Promise.resolve(value);
    }
}