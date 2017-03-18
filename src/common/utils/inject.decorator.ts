import 'reflect-metadata';
import { PARAMTYPES_METADATA } from '../constants';

export const Inject = (metadata: any[]): ClassDecorator => {
    return (target: Object) => {
        Reflect.defineMetadata(PARAMTYPES_METADATA, metadata, target);
    }
};
