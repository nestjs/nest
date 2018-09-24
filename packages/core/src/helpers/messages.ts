import { RequestMethod } from '@nestjs/common/enums/request-method.enum';

export const MODULE_INIT_MESSAGE = (text, module: string) =>
  `${module} dependencies initialized`;

export const ROUTE_MAPPED_MESSAGE = (path: string, method) =>
  `Mapped {${path}, ${RequestMethod[method]}} route`;

export const CONTROLLER_MAPPING_MESSAGE = (name: string, path: string) =>
  `${name} {${path}}:`;
