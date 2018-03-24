import { RequestMethod } from '@nestjs/common/enums/request-method.enum';

export const moduleInitMessage = (module: string) =>
  `${module} dependencies initialized`;
export const routeMappedMessage = (path: string, method) =>
  `Mapped {${path}, ${RequestMethod[method]}} route`;
export const controllerMappingMessage = (name: string, path: string) =>
  `${name} {${path}}:`;
