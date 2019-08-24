import { RENDER_METADATA } from '../../constants';

/**
 * Defines a template to be rendered by the controller.
 *
 * Example: `@Render('index)`
 *
 * @see [Example](https://github.com/nestjs/nest/blob/master/sample/15-mvc/src/app.controller.ts)
 * @publicApi
 */
export function Render(template: string): MethodDecorator {
  return (target: object, key, descriptor) => {
    Reflect.defineMetadata(RENDER_METADATA, template, descriptor.value);
    return descriptor;
  };
}
