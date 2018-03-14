import 'reflect-metadata';
import { MESSAGE_MAPPING_METADATA, MESSAGE_METADATA } from '@nestjs/websockets/constants';
import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';

export const ExtraMessage = (
  message?: { value: string } | string,
  extra?: { value: string } | string
): MethodDecorator => {
  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(MESSAGE_MAPPING_METADATA, true, descriptor.value);
    Reflect.defineMetadata(MESSAGE_METADATA, message, descriptor.value);
    Reflect.defineMetadata('extra', extra, descriptor.value);
    return descriptor;
  };
};
