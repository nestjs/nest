import type { EnhancerSubtype } from '@nestjs/common/internal';

export const MESSAGES = {
  APPLICATION_START: `Starting Nest application...`,
  APPLICATION_READY: `Nest application successfully started`,
  MICROSERVICE_READY: `Nest microservice successfully started`,
  UNKNOWN_EXCEPTION_MESSAGE: 'Internal server error',
  ERROR_DURING_SHUTDOWN: 'Error happened during shutdown',
  CALL_LISTEN_FIRST:
    'app.listen() needs to be called before calling app.getUrl()',
};

export const APP_INTERCEPTOR = 'APP_INTERCEPTOR';
export const APP_PIPE = 'APP_PIPE';
export const APP_GUARD = 'APP_GUARD';
export const APP_FILTER = 'APP_FILTER';
/**
 * Module-scoped counterparts of the `APP_*` enhancer tokens (see #17962).
 * A `MODULE_*` provider applies only to the controllers of the module that
 * declares it ("shallow" scoping: it does not reach into imported modules),
 * while `APP_*` providers keep applying to every controller in the process.
 */
export const MODULE_INTERCEPTOR = 'MODULE_INTERCEPTOR';
export const MODULE_PIPE = 'MODULE_PIPE';
export const MODULE_GUARD = 'MODULE_GUARD';
export const MODULE_FILTER = 'MODULE_FILTER';
export const ENHANCER_TOKEN_TO_SUBTYPE_MAP: Record<
  | typeof APP_GUARD
  | typeof APP_PIPE
  | typeof APP_FILTER
  | typeof APP_INTERCEPTOR
  | typeof MODULE_GUARD
  | typeof MODULE_PIPE
  | typeof MODULE_FILTER
  | typeof MODULE_INTERCEPTOR,
  EnhancerSubtype
> = {
  [APP_GUARD]: 'guard',
  [APP_INTERCEPTOR]: 'interceptor',
  [APP_PIPE]: 'pipe',
  [APP_FILTER]: 'filter',
  [MODULE_GUARD]: 'guard',
  [MODULE_INTERCEPTOR]: 'interceptor',
  [MODULE_PIPE]: 'pipe',
  [MODULE_FILTER]: 'filter',
} as const;
