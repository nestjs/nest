"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidMiddlewareMessage = (name) => `Your middleware doesn't have "resolve" method (${name})`;
exports.UnknownDependenciesMessage = (type) => `Nest could not resolves dependencies of ${type}.`;
exports.UnknownExportMessage = (name) => `You are trying to export unknown component (${name}). Remember - your component should be listed both in exports and components arrays!`;
exports.INVALID_MIDDLEWARE_CONFIGURATION = `Invalid middleware configuration passed in module 'configure()' method.`;
exports.UNKNOWN_REQUEST_MAPPING = `Request mapping properties not defined in @RequestMapping() annotation!`;
exports.UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Nest application Runtime Exception.`;
exports.INVALID_EXCEPTION_FILTER = `Invalid Exception Filters (@ExceptionFilters()).`;
//# sourceMappingURL=messages.js.map