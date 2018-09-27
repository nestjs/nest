import { TargetPropertyRef } from '@nest/core';

export interface HttpCodeMetadata extends TargetPropertyRef {
  statusCode: number;
}
