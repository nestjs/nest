import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '../../constants';
import { RouteParamtypes } from '../../enums/route-paramtypes.enum';

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
    data?: ParamData) => ({
    ...args,
    [`${paramtype}:${index}`]: {
        index,
        data,
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

export const Request: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.REQUEST);
export const Response: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.RESPONSE);
export const Next: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.NEXT);
export const Query: (property?: string) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.QUERY);
export const Body: (property?: string) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.BODY);
export const Param: (property?: string) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.PARAM);
export const Session: () => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.SESSION);
export const Headers: (property?: string) => ParameterDecorator = createRouteParamDecorator(RouteParamtypes.HEADERS);