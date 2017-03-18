import { RequestMethod } from '../../common/enums/request-method.enum';

export const getModuleInitMessage =
    (module: string) => `${module} dependencies initialized`;

export const getRouteMappedMessage =
    (path: string, method) => `Mapped {${path}, ${RequestMethod[method]}} route`;

export const getControllerMappingMessage =
    (name: string) => `${name}:`;

export const getMiddlewareInitMessage =
    (middleware: string, module: string) => `${middleware} injected into ${module}`;