"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deprecate = require("deprecate");
const constants_1 = require("../../constants");
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
 * Creates HTTP route param decorator
 * @param factory
 */
function createParamDecorator(factory) {
    const paramtype = randomString() + randomString();
    return (data, ...pipes) => (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, target, key) || {};
        Reflect.defineMetadata(constants_1.ROUTE_ARGS_METADATA, assignCustomMetadata(args, paramtype, index, factory, data, ...pipes), target, key);
    };
}
exports.createParamDecorator = createParamDecorator;
/**
 * Creates HTTP route param decorator
 * @deprecated
 * @param factory
 */
function createRouteParamDecorator(factory) {
    deprecate('The "createRouteParamDecorator" function is deprecated and will be removed within next major release. Use "createParamDecorator" instead.');
    return createParamDecorator(factory);
}
exports.createRouteParamDecorator = createRouteParamDecorator;
