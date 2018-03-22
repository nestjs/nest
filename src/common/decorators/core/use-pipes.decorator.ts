import { PipeTransform } from '../../interfaces/index';
import { PIPES_METADATA } from '../../constants';
import { extendArrayMetadata } from '../../utils/extend-metadata.util';

/**
 * Binds pipes to the particular context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be register to each handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be registered only to specified method
 *
 * @param  {PipeTransform[]} ...pipes (instances)
 */
export function UsePipes(...pipes: PipeTransform<any>[]) {
  return (target: object, key?, descriptor?) => {
    if (descriptor) {
      extendArrayMetadata(PIPES_METADATA, pipes, descriptor.value);
      return descriptor;
    }
    extendArrayMetadata(PIPES_METADATA, pipes, target);
    return target;
  };
}
