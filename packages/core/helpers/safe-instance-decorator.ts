import { Logger } from '@nestjs/common';

type InstanceDecorator = (target: unknown) => unknown;

const logger = new Logger('InstrumentLogger');

/**
 * Wraps an `instrument.instanceDecorator` so that a decorator throwing on a
 * given instance (e.g. when inspecting a Proxy whose traps throw outside of
 * their intended context, such as `nestjs-cls` proxy providers) does not
 * crash the application bootstrap. The original, undecorated instance is
 * used instead and a warning is logged.
 */
export function makeSafeInstanceDecorator(
  decorator: InstanceDecorator,
): InstanceDecorator {
  return (target: unknown) => {
    try {
      return decorator(target);
    } catch (err) {
      logger.warn(
        `The "instanceDecorator" function threw an error while decorating an instance (${
          (err as Error)?.message ?? err
        }). The undecorated instance will be used instead.`,
      );
      return target;
    }
  };
}
