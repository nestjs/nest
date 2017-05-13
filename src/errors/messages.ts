export const InvalidMiddlewareMessage = (name: string) =>
    `Your middleware doesn't have "resolve" method (${name})`;

export const InvalidModuleConfigMessage = (property: string) =>
    `Invalid property '${property}' in @Module() decorator.`;

export const UnknownDependenciesMessage = (type: string) =>
    `Nest could not resolves dependencies of ${type}.`;

export const UnknownExportMessage = (name: string) =>
    `You are trying to export unknown component (${name}). Remember - your component should be listed both in exports and components arrays!`;

export const INVALID_MIDDLEWARE_CONFIGURATION = `Invalid middleware configuration passed in module 'configure()' method.`;
export const UNKNOWN_REQUEST_MAPPING = `Request mapping properties not defined in @RequestMapping() annotation!`;
export const UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Nest application Runtime Exception.`;
export const INVALID_EXCEPTION_FILTER = `Invalid Exception Filters (@ExceptionFilters()).`;