import 'reflect-metadata';

import { CUSTOM_ROUTE_AGRS_METADATA, HTTP_CODE_METADATA, PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Controller, Transform } from '@nestjs/common/interfaces';
import { HttpException, HttpStatus, ParamData, PipeTransform, RequestMethod } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express-serve-static-core';
import { isFunction, isString, isUndefined } from '@nestjs/common/utils/shared.utils';

import { FORBIDDEN_MESSAGE } from '../guards/constants';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { IRouteParamsFactory } from './interfaces/route-params-factory.interface';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { PipesConsumer } from './../pipes/pipes-consumer';
import { PipesContextCreator } from './../pipes/pipes-context-creator';
import { RouteParamsMetadata } from '@nestjs/common/decorators';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { RouterResponseController } from './router-response-controller';

export interface ParamProperties {
    index: number;
    type: RouteParamtypes | string;
    data: ParamData;
    pipes: PipeTransform<any>[];
    extractValue: (req: Request, res: Response, next: NextFunction) => any;
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
        private readonly interceptorsConsumer: InterceptorsConsumer) { }

    public create(instance: Controller, callback: (...args: any[]) => any, methodName: string, module: string, requestMethod: RequestMethod) {
        const metadata = this.reflectCallbackMetadata(instance, methodName) || {};
        const keys = Object.keys(metadata);
        const argsLength = this.getArgumentsLength(keys, metadata);
        const pipes = this.pipesContextCreator.create(instance, callback);
        const paramtypes = this.reflectCallbackParamtypes(instance, methodName);
        const guards = this.guardsContextCreator.create(instance, callback, module);
        const interceptors = this.interceptorsContextCreator.create(instance, callback, module);
        const httpCode = this.reflectHttpStatusCode(callback);
        const paramsMetadata = this.exchangeKeysForValues(keys, metadata);
        const isResponseHandled = paramsMetadata.some(({ type }) => type === RouteParamtypes.RESPONSE || type === RouteParamtypes.NEXT);
        const paramsOptions = this.mergeParamsMetatypes(paramsMetadata, paramtypes);

        return async (req: Request, res: Response, next: NextFunction) => {
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
            return !isResponseHandled ?
                this.responseController.apply(result, res, requestMethod, httpCode) :
                undefined;
        };
    }

    public mapParamType(key: string): string {
        const keyPair = key.split(':');
        return keyPair[0];
    }

    public reflectCallbackMetadata(instance: Controller, methodName: string): RouteParamsMetadata {
        return Reflect.getMetadata(ROUTE_ARGS_METADATA, instance, methodName);
    }

    public reflectCallbackParamtypes(instance: Controller, methodName: string): any[] {
        return Reflect.getMetadata(PARAMTYPES_METADATA, instance, methodName);
    }

    public reflectHttpStatusCode(callback: (...args: any[]) => any): number {
        return Reflect.getMetadata(HTTP_CODE_METADATA, callback);
    }

    public getArgumentsLength(keys: string[], metadata: RouteParamsMetadata): number {
        return Math.max(...keys.map(key => metadata[key as any].index)) + 1;
    }

    public createNullArray(length: number): any[] {
        return Array.apply(null, { length }).fill(null);
    }

    public exchangeKeysForValues(keys: string[], metadata: RouteParamsMetadata): ParamProperties[] {
        return keys.map(key => {
            const { index, data, pipes } = metadata[key as any] as any;
            const type = this.mapParamType(key);

            if (key.includes(CUSTOM_ROUTE_AGRS_METADATA)) {
                const { factory } = metadata[key as any] as any;
                const customExtractValue = this.getCustomFactory(factory, data);
                return { index, extractValue: customExtractValue, type, data, pipes };
            }
            const nType = Number(type);
            const extractValue = (req: Request, res: Response, next: NextFunction) => this.paramsFactory.exchangeKeyForValue(nType, data, { req, res, next });
            return { index, extractValue, type: nType, data, pipes };
        });
    }

    public getCustomFactory(factory: (...args: any[]) => void, data: any): (...args: any[]) => any {
        return !isUndefined(factory) && isFunction(factory)
            ? (req, res, next) => factory(data, req)
            : () => null;
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
        { metatype, type, data }: {
            metatype: new (...args: any[]) => any;
            type: RouteParamtypes | string | any;
            data: string | any;
        },
        transforms: Transform<any>[]): Promise<any> {

        if (type === RouteParamtypes.BODY
            || type === RouteParamtypes.QUERY
            || type === RouteParamtypes.PARAM
            || isString(type)) {

            return await this.pipesConsumer.apply(value, { metatype, type, data }, transforms);
        }
        return Promise.resolve(value);
    }
}
