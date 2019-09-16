import { RequestMethod } from '@nestjs/common/enums/request-method.enum';

export const MODULE_INIT_MESSAGE = (
  text: TemplateStringsArray,
  module: string,
) => `${module} dependencies initialized`;

export const ROUTE_MAPPED_MESSAGE = (path: string, method: string | number) =>
  `Mapped {${path}, ${RequestMethod[method]}} route`;

export const CONTROLLER_MAPPING_MESSAGE = (name: string, path: string) =>
  `${name} {${path}}:`;

export const INVALID_EXECUTION_CONTEXT = (
  methodName: string,
  currentContext: string,
) =>
  `Calling ${methodName} is not allowed in this context. Your current execution context is "${currentContext}".`;
