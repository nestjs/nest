export const getInvalidMiddlewareMessage = (name: string) =>
    `You are trying to setup middleware without "resolve" method (${name})`;

export const getInvalidModuleConfigMessage = (property: string) =>
    `Invalid property '${property}' in @Module() decorator.`;

export const getUnkownDependenciesMessage = (type: string) =>
    `Nest can not recognize dependencies of ${type}.`;

export const getUnkownExportMessage = (name: string) =>
    `You are trying to export unkown component (${name}). Remember - your component should be listed both in exports and components arrays!`;

export const INVALID_MIDDLEWARE_CONFIGURATION =
    `Invalid middleware configuration passed in module 'configure()' method.`;

export const UNKOWN_REQUEST_MAPPING =
    `Request mapping properties not defined in @RequestMapping() annotation!`;