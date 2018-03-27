import { Paramtype } from './paramtype.interface';
export declare type Transform<T = any> = (
  value: T,
  metadata: ArgumentMetadata,
) => any;
export interface ArgumentMetadata {
  type: Paramtype;
  metatype?: new (...args) => any;
  data?: string;
}
export interface PipeTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R;
}
