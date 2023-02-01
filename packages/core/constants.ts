import { EnhancerSubtype } from '@nestjs/common/constants';

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
export const ENHANCER_TOKEN_TO_SUBTYPE_MAP: Record<
  | typeof APP_GUARD
  | typeof APP_PIPE
  | typeof APP_FILTER
  | typeof APP_INTERCEPTOR,
  EnhancerSubtype
> = {
  [APP_GUARD]: 'guard',
  [APP_INTERCEPTOR]: 'interceptor',
  [APP_PIPE]: 'pipe',
  [APP_FILTER]: 'filter',
} as const;
