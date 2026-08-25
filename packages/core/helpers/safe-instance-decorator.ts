import { Logger } from '@nestjs/common';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';

type InstanceDecorator = (target: unknown) => unknown;
type InstrumentOptions = NonNullable<
  NestApplicationContextOptions['instrument']
>;

const logger = new Logger('InstrumentLogger');

/**
 * Composes the `instrument` options into a single, safe instance decorator.
 * Instances for which `skipInstrumentation` returns `true` are passed through
 * untouched. Additionally, a decorator (or predicate) throwing on a given
 * instance (e.g. when inspecting a Proxy whose traps throw outside of their
 * intended context, such as `nestjs-cls` proxy providers) does not crash the
 * application bootstrap: the original, undecorated instance is used instead
 * and a warning is logged.
 */
export function makeSafeInstanceDecorator(
  instrument: InstrumentOptions,
): InstanceDecorator {
  return (target: unknown) => {
    try {
      if (instrument.skipInstrumentation?.(target)) {
        return target;
      }
      return instrument.instanceDecorator(target);
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
