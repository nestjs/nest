import 'reflect-metadata';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '../constants';
import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';

/**
 * Subscribes to the messages, which fulfils chosen pattern.
 */
export const SubscribeMessage = (message?: { value: string } | string): MethodDecorator => {
    let metadata = isObject(message) ? message.value : message;
    metadata = isUndefined(metadata) ? '' : metadata;

    return (target, key, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(MESSAGE_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(MESSAGE_METADATA, metadata, descriptor.value);
        return descriptor;
    };
};