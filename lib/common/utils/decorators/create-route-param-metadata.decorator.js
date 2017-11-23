"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const assignCustomMetadata = (args, paramtype, index, factory, data) => (Object.assign({}, args, { [`${index}:${paramtype}${constants_1.CUSTOM_ROUTE_AGRS_METADATA}:${index}`]: {
        index,
        factory,
        data,
    } }));
const randomString = () => Math.random().toString(36).substring(2, 15);
/**
 * Create route params custom decorator
 * @param factory
 */
exports.createRouteParamDecorator = (factory) => {
    const paramtype = randomString() + randomString();
    return (data) => (target, key, index) => {
        const args = Reflect.getMetadata(constants_1.ROUTE_ARGS_METADATA, target, key) || {};
        Reflect.defineMetadata(constants_1.ROUTE_ARGS_METADATA, assignCustomMetadata(args, paramtype, index, factory, data), target, key);
    };
};
