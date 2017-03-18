import 'reflect-metadata';
import { ControllerMetadata } from '../interfaces/controller-metadata.interface';
import { isUndefined } from './shared.utils';
import { PATH_METADATA } from '../constants';

const defaultMetadata = { [PATH_METADATA]: '/' };

export const Controller = (metadata: ControllerMetadata = defaultMetadata): ClassDecorator => {
    if (isUndefined(metadata[PATH_METADATA])) {
        metadata[PATH_METADATA] = '/';
    }
    return (target: Object) => {
        Reflect.defineMetadata(PATH_METADATA, metadata[PATH_METADATA], target);
    }
};