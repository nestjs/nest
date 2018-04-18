import { PipeTransform } from '../../interfaces/index';
import { PIPES_METADATA } from '../../constants';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';
import { validateEach } from '../../utils/validate-each.util';
import { isFunction } from '../../utils/shared.utils';

/**
 * Binds pipes to the particular context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be register to each handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be registered only to specified method
 *
 * @param  {PipeTransform[]} ...pipes
 */
export function UsePipes(...pipes: (PipeTransform | Function)[]) {
  return (target: any, key?, descriptor?) => {
    const isPipeValid = pipe =>
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
