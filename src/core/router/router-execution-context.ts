import 'reflect-metadata';
import { ROUTE_ARGS_METADATA, PARAMTYPES_METADATA, HTTP_CODE_METADATA, CUSTOM_ROUTE_AGRS_METADATA } from '@nestjs/common/constants';
import { isUndefined, isFunction } from '@nestjs/common/utils/shared.utils';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { RouteParamsMetadata } from '@nestjs/common/utils';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import { PipesContextCreator } from './../pipes/pipes-context-creator';
import { PipesConsumer } from './../pipes/pipes-consumer';
import { ParamData, PipeTransform, HttpStatus, RequestMethod } from '@nestjs/common';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { GuardsConsumer } from '../guards/guards-consumer';
import { FORBIDDEN_MESSAGE } from '../guards/constants';
import { HttpException } from '../index';
import { RouterResponseController } from './router-response-controller';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';

export interface ParamProperties {
    index: number;
    type: RouteParamtypes;
    data: ParamData;
    pipes: PipeTransform<any>[];
    extractValue: (req, res, next) => any;
}

export class RouterExecutionContext {
    private readonly responseController = new RouterResponseController();
    constructor(
        private readonly paramsFactory: IRouteParamsFactory,
        private readonly pipesContextCreator: PipesContextCreator,
        private readonly pipesConsumer: PipesConsumer,
        private readonly guardsContextCreator: GuardsContextCreator,
        private readonly guardsConsumer: GuardsConsumer,
        private readonly interceptorsContextCreator: InterceptorsContextCreator,
        private readonly interceptorsConsumer: InterceptorsConsumer) {}

    public create(instance: Controller, callback: (...args) => any, methodName: string, module: string, requestMethod: RequestMethod) {
        const metadata = this.reflectCallbackMetadata(instance, methodName) || {};
        const keys = Object.keys(metadata);
        const argsLength = this.getArgumentsLength(keys, metadata);
        const pipes = this.pipesContextCreator.create(instance, callback);
        const paramtypes = this.reflectCallbackParamtypes(instance, methodName);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        const httpCode = this.reflectHttpStatusCode(callback);
        const paramsMetadata = this.exchangeKeysForValues(keys, metadata);
        const isResponseObj = paramsMetadata.some(({ type }) => type === RouteParamtypes.RESPONSE);
        const paramsOptions = this.mergeParamsMetatypes(paramsMetadata, paramtypes);

        return async (req, res, next) => {
            const args = this.createNullArray(argsLength);
            const canActivate = await this.guardsConsumer.tryActivate(guards, req, instance, callback);
            if (!canActivate) {
                throw new HttpException(FORBIDDEN_MESSAGE, HttpStatus.FORBIDDEN);
            }

            await Promise.all(paramsOptions.map(async (param) => {
                const { index, extractValue, type, data, metatype, pipes: paramPipes } = param;
                const value = extractValue(req, res, next);

                args[index] = await this.getParamValue(
                    value, { metatype, type, data },
                    pipes.concat(this.pipesContextCreator.createConcreteContext(paramPipes)),
                );
            }));
            const handler = () => callback.apply(instance, args);
            const result = await this.interceptorsConsumer.intercept(
                interceptors, req, instance, callback, handler,
            );
            return !isResponseObj ?
                this.responseController.apply(result, res, requestMethod, httpCode) :
                undefined;
        };
    }

    public mapParamType(key: string): RouteParamtypes {
        const keyPair = key.split(':');
        return Number(keyPair[0]);
    }

    public mapCustomParamType(key: string) {
        const keyPair = key.split(':');
        return keyPair[0];
    }

    public reflectCallbackMetadata(instance: Controller, methodName: string): RouteParamsMetadata {
        return Reflect.getMetadata(ROUTE_ARGS_METADATA, instance, methodName);
    }

    public reflectCallbackParamtypes(instance: Controller, methodName: string): any[] {
        return Reflect.getMetadata(PARAMTYPES_METADATA, instance, methodName);
    }

    public reflectHttpStatusCode(callback: (...args) => any): number {
        return Reflect.getMetadata(HTTP_CODE_METADATA, callback);
    }

    public getArgumentsLength(keys: string[], metadata: RouteParamsMetadata): number {
        return Math.max(...keys.map(key => metadata[key].index)) + 1;
    }

    public createNullArray(length: number): any[] {
        return Array.apply(null, { length }).fill(null);
    }

    public exchangeKeysForValues(keys: string[], metadata: RouteParamsMetadata): ParamProperties[] {
        return keys.map(key => {
            const { index, data, pipes } = metadata[key];
            let type, extractValue;

            if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
                const { reflector } = metadata[key];
                type = this.mapCustomParamType(key);
                extractValue = (req, res, next) => !isUndefined(reflector) && isFunction(reflector)
                    ? reflector(data, req)
                    : () => {};

                return { index, extractValue, type, data, pipes };
            }

            type = this.mapParamType(key);
            extractValue = (req, res, next) => this.paramsFactory.exchangeKeyForValue(type, data, { req, res, next });

            return { index, extractValue, type, data, pipes };
        });
    }

    public mergeParamsMetatypes(
      paramsProperties: ParamProperties[],
      paramtypes: any[],
    ): (ParamProperties & { metatype?: any })[] {
      if (!paramtypes) {
        return paramsProperties;
      }
      return paramsProperties.map((param) => ({ ...param, metatype: paramtypes[param.index] }));
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