import 'reflect-metadata';
/**
 * Subscribes to messages that fulfils chosen pattern.
 */
export declare const SubscribeMessage: <T = string>(
  message: T,
) => MethodDecorator;
