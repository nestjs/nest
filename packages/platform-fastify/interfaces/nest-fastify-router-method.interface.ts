import { REQUEST_METHOD_MAP } from '@nestjs/core/helpers/router-method-factory';

export type RouterMethod =
  (typeof REQUEST_METHOD_MAP)[keyof typeof REQUEST_METHOD_MAP];
