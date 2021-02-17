import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import {
  VERSION_NEUTRAL,
  VersionValue,
} from '@nestjs/common/interfaces/version-options.interface';

export const MODULE_INIT_MESSAGE = (
  text: TemplateStringsArray,
  module: string,
) => `${module} dependencies initialized`;

export const ROUTE_MAPPED_MESSAGE = (path: string, method: string | number) =>
  `Mapped {${path}, ${RequestMethod[method]}} route`;

export const VERSIONED_ROUTE_MAPPED_MESSAGE = (
  path: string,
  method: string | number,
  version: VersionValue,
) => {
  if (version === VERSION_NEUTRAL) {
    version = 'Neutral';
  }
  return `Mapped {${path}, ${RequestMethod[method]}}(Version: ${version}) route`;
};

export const CONTROLLER_MAPPING_MESSAGE = (name: string, path: string) =>
  `${name} {${path}}:`;

export const VERSIONED_CONTROLLER_MAPPING_MESSAGE = (
  name: string,
  path: string,
  version: VersionValue,
) => {
  if (version === VERSION_NEUTRAL) {
    version = 'Neutral';
  }
  return `${name} {${path}}(Version: ${version}):`;
};

export const INVALID_EXECUTION_CONTEXT = (
  methodName: string,
  currentContext: string,
) =>
  `Calling ${methodName} is not allowed in this context. Your current execution context is "${currentContext}".`;
