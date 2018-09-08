"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deprecate = require("deprecate");
const uuid = require("uuid/v4");
const constants_1 = require("../../constants");
const shared_utils_1 = require("../../utils/shared.utils");
const assignCustomMetadata = (args, paramtype, index, factory, data, ...pipes) => (Object.assign({}, args, { [`${paramtype}${constants_1.CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
        index,
        factory,
        data,
        pipes,
    } }));
/**
 * Defines HTTP route param decorator
 * @param factory
 */
function createParamDecorator(factory, enhancers = []) {
    const paramtype = uuid();
    return (data, ...pipes) => (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, target.constructor, key) || {};
        const isPipe = pipe => pipe &&
            ((shared_utils_1.isFunction(pipe) && pipe.prototype) || shared_utils_1.isFunction(pipe.transform));
        const hasParamData = shared_utils_1.isNil(data) || !isPipe(data);
        const paramData = hasParamData ? data : undefined;
        const paramPipes = hasParamData ? pipes : [data, ...pipes];
        Reflect.defineMetadata(constants_1.ROUTE_ARGS_METADATA, assignCustomMetadata(args, paramtype, index, factory, paramData, ...paramPipes), target.constructor, key);
        enhancers.forEach(fn => fn(target, key, index));
    };
}
exports.createParamDecorator = createParamDecorator;
/**
 * Defines HTTP route param decorator
 * @deprecated
 * @param factory
 */
function createRouteParamDecorator(factory) {
    deprecate('The "createRouteParamDecorator" function is deprecated and will be removed within next major release. Use "createParamDecorator" instead.');
    return createParamDecorator(factory);
}
exports.createRouteParamDecorator = createRouteParamDecorator;
