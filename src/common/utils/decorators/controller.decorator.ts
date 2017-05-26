import 'reflect-metadata';
import { ControllerMetadata } from '../../interfaces/controllers/controller-metadata.interface';
import { isUndefined, isObject } from '../shared.utils';
import { PATH_METADATA } from '../../constants';

export const Controller = (metadata?: ControllerMetadata | string): ClassDecorator => {
    let path = isObject(metadata) ? metadata[PATH_METADATA] : metadata;
    path = isUndefined(path) ? '/' : path;

    return (target: object) => {
        Reflect.defineMetadata(PATH_METADATA, path, target);
    };
};