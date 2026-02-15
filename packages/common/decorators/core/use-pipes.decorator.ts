import { PIPES_METADATA } from '../../constants.js';
import { PipeTransform } from '../../interfaces/index.js';
import { extendArrayMetadata } from '../../utils/extend-metadata.util.js';
import { isFunction } from '../../utils/shared.utils.js';
import { validateEach } from '../../utils/validate-each.util.js';

/**
 * Decorator that binds pipes to the scope of the controller or method,
 * depending on its context.
 *
 * When `@UsePipes` is used at the controller level, the pipe will be
 * applied to every handler (method) in the controller.
 *
 * When `@UsePipes` is used at the individual handler level, the pipe
 * will apply only to that specific method.
 *
 * @param pipes a single pipe instance or class, or a list of pipe instances or
 * classes.
 *
 * @see [Pipes](https://docs.nestjs.com/pipes)
 *
 * @usageNotes
 * Pipes can also be set up globally for all controllers and routes
 * using `app.useGlobalPipes()`.  [See here for details](https://docs.nestjs.com/pipes#class-validator)
 *
 * @publicApi
 */

export function UsePipes(
  ...pipes: (PipeTransform | Function)[]
): ClassDecorator & MethodDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const isPipeValid = <T extends Function | Record<string, any>>(pipe: T) =>
      pipe && (isFunction(pipe) || isFunction(pipe.transform));

    if (descriptor) {
      extendArrayMetadata(PIPES_METADATA, pipes, descriptor.value);
      return descriptor;
    }
    validateEach(target, pipes, isPipeValid, '@UsePipes', 'pipe');
    extendArrayMetadata(PIPES_METADATA, pipes, target);
    return target;
  };
}
