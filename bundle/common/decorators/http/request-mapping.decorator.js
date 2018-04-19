"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const request_method_enum_1 = require("../../enums/request-method.enum");
const constants_1 = require("../../constants");
const defaultMetadata = {
    [constants_1.PATH_METADATA]: '/',
    [constants_1.METHOD_METADATA]: request_method_enum_1.RequestMethod.GET,
};
exports.RequestMapping = (metadata = defaultMetadata) => {
    const path = metadata[constants_1.PATH_METADATA] || '/';
    const requestMethod = metadata[constants_1.METHOD_METADATA] || request_method_enum_1.RequestMethod.GET;
    return (target, key, descriptor) => {
        Reflect.defineMetadata(constants_1.PATH_METADATA, path, descriptor.value);
        Reflect.defineMetadata(constants_1.METHOD_METADATA, requestMethod, descriptor.value);
        return descriptor;
    };
};
const createMappingDecorator = (method) => (path) => {
    return exports.RequestMapping({
        [constants_1.PATH_METADATA]: path,
        [constants_1.METHOD_METADATA]: method,
    });
};
/**
 * Routes HTTP POST requests to the specified path.
 */
exports.Post = createMappingDecorator(request_method_enum_1.RequestMethod.POST);
/**
 * Routes HTTP GET requests to the specified path.
 */
exports.Get = createMappingDecorator(request_method_enum_1.RequestMethod.GET);
/**
 * Routes HTTP DELETE requests to the specified path.
 */
exports.Delete = createMappingDecorator(request_method_enum_1.RequestMethod.DELETE);
/**
 * Routes HTTP PUT requests to the specified path.
 */
exports.Put = createMappingDecorator(request_method_enum_1.RequestMethod.PUT);
/**
 * Routes HTTP PATCH requests to the specified path.
 */
exports.Patch = createMappingDecorator(request_method_enum_1.RequestMethod.PATCH);
/**
 * Routes HTTP OPTIONS requests to the specified path.
 */
exports.Options = createMappingDecorator(request_method_enum_1.RequestMethod.OPTIONS);
/**
 * Routes HTTP HEAD requests to the specified path.
 */
exports.Head = createMappingDecorator(request_method_enum_1.RequestMethod.HEAD);
/**
 * Routes all HTTP requests to the specified path.
 */
exports.All = createMappingDecorator(request_method_enum_1.RequestMethod.ALL);
