import { TargetRef } from '@nest/core';

export interface ControllerMetadata extends TargetRef {
  path: string;
}
