import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '../../constants';
import { RouteParamtypes } from '../../enums/route-paramtypes.enum';
import { PipeTransform } from '../../index';

export type ParamData = object | string | number;
export interface RouteParamsMetadata {
    [prop: number]: {
        index: number;
        data?: ParamData;
    };
}

const assignMetadata = (
    args: RouteParamsMetadata,
    paramtype: RouteParamtypes,
    index: number,
    data?: ParamData,
    ...pipes: PipeTransform[]) => ({
    ...args,
    [`${paramtype}:${index}`]: {
        index,
        data,
        pipes,
    },
});

const createRouteParamDecorator = (paramtype: RouteParamtypes) => {
    return (data?: ParamData): ParameterDecorator => (target, key, index) => {
        const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
        Reflect.defineMetadata(
            ROUTE_ARGS_METADATA,
            assignMetadata(args, paramtype, index, data),
            target,
            key,
        );
    };
};

const createRouteParamDecoratorWithPipes = (paramtype: RouteParamtypes) => {
    return (data?: ParamData, ...pipes: PipeTransform[]): ParameterDecorator => (target, key, index) => {
        const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key) || {};
        Reflect.defineMetadata(
            ROUTE_ARGS_METADATA,
            assignMetadata(args, paramtype, index, data, ...pipes),
            target,
            key,
        );
    };
};

export const Request: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.REQUEST);
export const Response: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.RESPONSE);
export const Next: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.NEXT);
export const Session: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.SESSION);
export const Headers: (property?: string) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.HEADERS);

export const Query: (property?: string, ...pipes: PipeTransform[]) => ParameterDecorator = createRouteParamDecoratorWithPipes(RouteParamtypes.QUERY);
export const Body: (property?: string, ...pipes: PipeTransform[]) => ParameterDecorator = createRouteParamDecoratorWithPipes(RouteParamtypes.BODY);
export const Param: (property?: string, ...pipes: PipeTransform[]) => ParameterDecorator = createRouteParamDecoratorWithPipes(RouteParamtypes.PARAM);

export const Req = Request;
export const Res = Response;