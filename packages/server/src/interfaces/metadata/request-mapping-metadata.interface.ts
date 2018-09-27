import { TargetPropertyRef } from '@nest/core';

export interface RequestMappingMetadata extends TargetPropertyRef {
  requestMethod: string;
  path: string;
}
