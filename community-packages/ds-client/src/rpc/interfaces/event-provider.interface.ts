import { MethodDecoratorMetadata } from '@nest/core';

export interface EventProvider extends MethodDecoratorMetadata {
  event: string;
}
