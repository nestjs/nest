import { Event } from './event.decorator';

// @TODO: event.once
export function Once(eventFn: typeof Event): MethodDecorator {
  return (target: object, method: string) => {
    // Reflect.defineMetadata(method, 'ONCE', target);
  };
}
