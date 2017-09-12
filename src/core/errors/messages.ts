export const InvalidMiddlewareMessage = (name: string) =>
    `The middleware doesn't provide the 'resolve' method (${name})`;

export const InvalidModuleMessage = (scope: string) =>
    `Nest can't create the module instance. The frequent reason of this exception is the circular dependency between modules. Scope [${scope}]`;

export const UnknownDependenciesMessage = (type: string) =>
    `Nest can't resolve dependencies of the ${type}. Please verify whether all of them are available in the current context.`;

export const UnknownExportMessage = (name: string) =>
    `You are trying to export unknown component (${name}). Remember - your component should be listed both in exports and components arrays!`;

export const INVALID_MIDDLEWARE_CONFIGURATION = `Invalid middleware configuration passed inside the module 'configure()' method.`;
export const UNKNOWN_REQUEST_MAPPING = `Request mapping properties not defined in the @RequestMapping() annotation!`;
export const UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Runtime Exception.`;
export const INVALID_EXCEPTION_FILTER = `Invalid exception filters (@ExceptionFilters()).`;