import 'reflect-metadata';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '../constants';

const defaultMetadata = { value: '' };
export const SubscribeMessage = (metadata: { value: string } = defaultMetadata): MethodDecorator => {
    return (target, key, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(MESSAGE_MAPPING_METADATA, true, descriptor.value);
        Reflect.defineMetadata(MESSAGE_METADATA, metadata.value, descriptor.value);

        return descriptor;
    }
};