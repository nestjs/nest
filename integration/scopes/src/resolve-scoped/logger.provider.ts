import { FactoryProvider } from '@nestjs/common/interfaces';

export const LOGGER_PROVIDER = 'LOGGER_PROVIDER';
export const loggerProvider: FactoryProvider = {
  provide: LOGGER_PROVIDER,
  useFactory: () => {
    return { logger: true };
  },
};
