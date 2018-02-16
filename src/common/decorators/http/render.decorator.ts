import 'reflect-metadata';
import { RENDER_METADATA } from '../../constants';

/**
 * Defines a template that should be rendered by a controller.
 */
export function Render(template: string): MethodDecorator {
  return (target: object, key, descriptor) => {
    Reflect.defineMetadata(RENDER_METADATA, template, descriptor.value);
    return descriptor;
  };
}
