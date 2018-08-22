"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deprecate = require("deprecate");
const constants_1 = require("../../constants");
const shared_utils_1 = require("../../utils/shared.utils");
const assignCustomMetadata = (args, paramtype, index, factory, data, ...pipes) => (Object.assign({}, args, { [`${paramtype}${constants_1.CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
        index,
        factory,
        data,
        pipes,
    } }));
const randomString = () => Math.random()
    .toString(36)
    .substring(2, 15);
/**
 * Defines HTTP route param decorator
 * @param factory
 */
function createParamDecorator(factory, enhancers = []) {
    const paramtype = randomString() + randomString();
    return (data, ...pipes) => (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, target.constructor, key) || {};
        const hasParamData = shared_utils_1.isNil(data) || shared_utils_1.isString(data);
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
