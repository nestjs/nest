"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const route_paramtypes_enum_1 = require("../../enums/route-paramtypes.enum");
const shared_utils_1 = require("../../utils/shared.utils");
const assignMetadata = (args, paramtype, index, data, ...pipes) => (Object.assign({}, args, { [`${paramtype}:${index}`]: {
        index,
        data,
        pipes,
    } }));
const createRouteParamDecorator = (paramtype) => {
    return (data) => (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, target, key) || {};
        Reflect.defineMetadata(constants_1.ROUTE_ARGS_METADATA, assignMetadata(args, paramtype, index, data), target, key);
    };
};
const createPipesRouteParamDecorator = (paramtype) => (data, ...pipes) => (target, key, index) => {
    const args = Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, target, key) || {};
    const hasParamData = shared_utils_1.isNil(data) || shared_utils_1.isString(data);
    const paramData = hasParamData ? data : undefined;
    const paramPipes = hasParamData ? pipes : [data, ...pipes];
    Reflect.defineMetadata(constants_1.ROUTE_ARGS_METADATA, assignMetadata(args, paramtype, index, paramData, ...paramPipes), target, key);
};
exports.Request = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.REQUEST);
exports.Response = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.RESPONSE);
exports.Next = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.NEXT);
exports.Session = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.SESSION);
exports.UploadedFile = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.FILE);
exports.UploadedFiles = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.FILES);
exports.Headers = createRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.HEADERS);
function Query(property, ...pipes) {
    return createPipesRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.QUERY)(property, ...pipes);
}
exports.Query = Query;
function Body(property, ...pipes) {
    return createPipesRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.BODY)(property, ...pipes);
}
exports.Body = Body;
function Param(property, ...pipes) {
    return createPipesRouteParamDecorator(route_paramtypes_enum_1.RouteParamtypes.PARAM)(property, ...pipes);
}
exports.Param = Param;
exports.Req = exports.Request;
exports.Res = exports.Response;
