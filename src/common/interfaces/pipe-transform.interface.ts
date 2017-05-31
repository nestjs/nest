import { Paramtype } from './paramtype.interface';

export type Transform<T> = (value: T, metadata?: ArgumentMetadata) => any;

export interface ArgumentMetadata {
    type: Paramtype;
    metatype?: any;
}

export interface PipeTransform {
    transform: Transform<any>;
}