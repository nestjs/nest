import { RequestMethod } from '../../common/enums/request-method.enum';

export const ModuleInitMessage = (module: string) => `${module} dependencies initialized`;
export const RouteMappedMessage = (path: string, method) => `Mapped {${path}, ${RequestMethod[method]}} route`;
export const ControllerMappingMessage = (name: string) => `${name}:`;