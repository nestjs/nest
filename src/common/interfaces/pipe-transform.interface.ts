import { Paramtype } from './paramtype.interface';

export type Transform<T> = (value: T, metatype?, type?: Paramtype) => any;

export interface PipeTransform {
    transform: Transform<any>;
}