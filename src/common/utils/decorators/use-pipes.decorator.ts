import {PIPES_METADATA} from '../../constants';
import {PipeTransform} from '../../interfaces/index';

/**
 * Setups pipes to the chosen context.
 * When the `@UsePipes()` is used on the controller level:
 * - Pipe will be set up to every handler (every method)
 *
 * When the `@UsePipes()` is used on the handle level:
 * - Pipe will be set up only to specified method
 *
 * @param  {PipeTransform[]} ...pipes (instances)
 */
export function UsePipes(...pipes: PipeTransform<any>[]) {
  return (target: object, key?, descriptor?) => {
    if (descriptor) {
      Reflect.defineMetadata(PIPES_METADATA, pipes, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PIPES_METADATA, pipes, target);
    return target;
  };
}
