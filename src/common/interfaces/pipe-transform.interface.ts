import {Paramtype} from './paramtype.interface';

export type Transform<T> = (value: T, metadata: ArgumentMetadata) => any;

export interface ArgumentMetadata {
  type: Paramtype;
  metatype?: new(...args) => any;
  data?: string;
}

export interface PipeTransform<T> {
  transform(value: T, metadata: ArgumentMetadata): any;
}