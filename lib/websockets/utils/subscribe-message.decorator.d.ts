import 'reflect-metadata';
/**
 * Subscribes to the messages, which fulfils chosen pattern.
 */
export declare const SubscribeMessage: (
  message?:
    | string
    | {
        value: string;
      },
) => MethodDecorator;
