import { MetadataStorage } from '../storage';

export function Event(name: string): MethodDecorator {
  return (target, method) => {
    MetadataStorage.events.add({
      target: target.constructor,
      method,
      name,
    });
  };
}
