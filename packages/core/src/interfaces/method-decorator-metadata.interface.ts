import { TargetRef } from './target-ref.interface';

export interface MethodDecoratorMetadata extends TargetRef {
  method: string | symbol;
  [key: string]: any;
}
