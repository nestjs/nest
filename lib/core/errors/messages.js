"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnknownDependenciesMessage = (type, index, length) => {
    let message = `Nest can't resolve dependencies of the ${type}`;
    message += ` (`;
    const args = new Array(length).fill('+');
    args[index] = '?';
    message += args.join(', ');
    message += `). Please verify whether [${index}] argument is available in the current context.`;
    return message;
};
exports.InvalidMiddlewareMessage = (name) => `The middleware doesn't provide the 'resolve' method (${name})`;
exports.InvalidModuleMessage = (scope) => `Nest can't create the module instance. The frequent reason of this exception is the circular dependency between modules. Use forwardRef() to avoid it (read more https://docs.nestjs.com/advanced/circular-dependency). Scope [${scope}]`;
exports.UnknownExportMessage = (name) => `You are trying to export unknown component (${name}). Remember - your component should be listed both in exports and components arrays!`;
exports.INVALID_MIDDLEWARE_CONFIGURATION = `Invalid middleware configuration passed inside the module 'configure()' method.`;
exports.UNKNOWN_REQUEST_MAPPING = `Request mapping properties not defined in the @RequestMapping() annotation!`;
exports.UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Runtime Exception.`;
exports.INVALID_EXCEPTION_FILTER = `Invalid exception filters (@UseFilters()).`;
exports.MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION = `Unable to load @nestjs/microservices package (please, make sure whether it's installed already).`;
