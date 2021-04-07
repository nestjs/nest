import { Inject, Injectable, Scope } from '@nestjs/common';

import { LOGGER_PROVIDER } from './logger.provider';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor(@Inject(LOGGER_PROVIDER) public logger) {}
}
