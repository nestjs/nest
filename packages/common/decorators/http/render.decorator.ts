import { RENDER_METADATA } from '../../constants';

/**
 * Defines a template to be rendered by the controller.
 */
export function Render(template: string): MethodDecorator {
  return (target: object, key, descriptor) => {
    Reflect.defineMetadata(RENDER_METADATA, template, descriptor.value);
    return descriptor;
  };
}
