export const MESSAGES = {
  APPLICATION_START: `Starting Nest application...`,
  APPLICATION_READY: `Nest application successfully started`,
  MICROSERVICE_READY: `Nest microservice successfully started`,
  UNKNOWN_EXCEPTION_MESSAGE: 'Internal server error',
};

export const APP_INTERCEPTOR = 'APP_INTERCEPTOR';
export const APP_PIPE = 'APP_PIPE';
export const APP_GUARD = 'APP_GUARD';
export const APP_FILTER = 'APP_FILTER';
export const SHUTDOWN_SIGNALS = [
  'SIGHUP',
  'SIGINT',
  'SIGQUIT',
  'SIGILL',
  'SIGTRAP',
  'SIGABRT',
  'SIGBUS',
  'SIGFPE',
  'SIGUSR1',
  'SIGSEGV',
  'SIGUSR2',
  'SIGTERM',
];
