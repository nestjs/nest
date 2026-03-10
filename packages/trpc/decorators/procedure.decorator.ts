import {
  TRPC_INPUT_METADATA,
  TRPC_OUTPUT_METADATA,
  TRPC_PROCEDURE_METADATA,
  TRPC_PROCEDURE_TYPE_METADATA,
} from '../constants';
import { ProcedureType } from '../enums';

interface ProcedureOptions {
  /** Custom tRPC input schema (e.g. a Zod schema). Applied via `.input()`. */
  input?: any;
  /** Custom tRPC output schema (e.g. a Zod schema). Applied via `.output()`. */
  output?: any;
}

function createProcedureDecorator(type: ProcedureType) {
  return (
    nameOrOptions?: string | ProcedureOptions,
    options?: ProcedureOptions,
  ): MethodDecorator => {
    let procedureName: string | undefined;
    let opts: ProcedureOptions = {};

    if (typeof nameOrOptions === 'string') {
      procedureName = nameOrOptions;
      opts = options ?? {};
    } else if (typeof nameOrOptions === 'object') {
      opts = nameOrOptions;
    }

    return (
      target: object,
      key: string | symbol,
      descriptor: PropertyDescriptor,
    ) => {
      const name = procedureName ?? String(key);

      Reflect.defineMetadata(TRPC_PROCEDURE_METADATA, name, descriptor.value);
      Reflect.defineMetadata(
        TRPC_PROCEDURE_TYPE_METADATA,
        type,
        descriptor.value,
      );
      if (opts.input) {
        Reflect.defineMetadata(
          TRPC_INPUT_METADATA,
          opts.input,
          descriptor.value,
        );
      }
      if (opts.output) {
        Reflect.defineMetadata(
          TRPC_OUTPUT_METADATA,
          opts.output,
          descriptor.value,
        );
      }
      return descriptor;
    };
  };
}

/**
 * Marks a method as a tRPC query procedure.
 *
 * @param name - Optional procedure name (defaults to the method name).
 * @param options - Optional input/output schemas.
 *
 * @publicApi
 */
export const Query = createProcedureDecorator(ProcedureType.QUERY);

/**
 * Marks a method as a tRPC mutation procedure.
 *
 * @param name - Optional procedure name (defaults to the method name).
 * @param options - Optional input/output schemas.
 *
 * @publicApi
 */
export const Mutation = createProcedureDecorator(ProcedureType.MUTATION);

/**
 * Marks a method as a tRPC subscription procedure.
 *
 * @param name - Optional procedure name (defaults to the method name).
 * @param options - Optional input/output schemas.
 *
 * @publicApi
 */
export const Subscription = createProcedureDecorator(
  ProcedureType.SUBSCRIPTION,
);
