import 'reflect-metadata';
import { ControllerMetadata } from '../interfaces/controller-metadata.interface';

const defaultMetadata = { path: '/' };

export const Controller = (metadata: ControllerMetadata = defaultMetadata): ClassDecorator => {
    if (typeof metadata.path === 'undefined') {
        metadata.path = '/';
    }
    return (target: Object) => {
        Reflect.defineMetadata('path', metadata.path, target);
    }
};