import { Inject, Injectable, Scope } from '@nestjs/common';
import { LOGGER_PROVIDER } from './logger.provider.js';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  constructor(@Inject(LOGGER_PROVIDER) public logger) {}
}
