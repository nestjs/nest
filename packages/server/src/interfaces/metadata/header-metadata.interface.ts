import { TargetPropertyRef } from '@nest/core';

export interface HeaderMetadata extends TargetPropertyRef {
  name: string;
  value: string;
}
