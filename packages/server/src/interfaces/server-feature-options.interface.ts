import { Type } from '@nest/core';

import { MiddlewareConfigure } from './middleware';

export interface ServerFeatureOptions {
  prefix?: string;
  guards?: any[];
  interceptors?: any[];
  middleware?: any[];
  pipes?: any[];
  configure?: MiddlewareConfigure;
}
