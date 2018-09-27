import { MethodDecoratorMetadata } from '@nest/core';

export interface EventMetadata extends MethodDecoratorMetadata {
  name: string;
}
