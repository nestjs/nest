import { RequestMethod } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';

export type HttpEntrypointMetadata = {
  path: string;
  requestMethod: keyof typeof RequestMethod;
  methodVersion?: VersionValue;
  controllerVersion?: VersionValue;
};

export type MiddlewareEntrypointMetadata = {
  path: string;
  requestMethod: keyof typeof RequestMethod;
  version?: VersionValue;
};

export type Entrypoint<T> = {
  type: string;
  methodName: string;
  className: string;
  classNodeId: string;
  metadata: T;
};
