import { REQUEST_PATTERN_METADATA, REPLY_PATTERN_METADATA } from '../constants';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

/**
 * Makes outgoing to incoming messages that fulfils the chosen patterns.
 */
export const MessageRequest = <T = PatternMetadata | string>(
  requestMetadata: T,
  replyMetadata?: T
): MethodDecorator => {
  return (
    target: any,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(REQUEST_PATTERN_METADATA, requestMetadata, descriptor.value);
    Reflect.defineMetadata(REPLY_PATTERN_METADATA, replyMetadata, descriptor.value);
    return descriptor;
  };
};