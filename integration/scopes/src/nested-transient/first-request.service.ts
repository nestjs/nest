import { Injectable, Scope } from '@nestjs/common';
import { TransientLoggerService } from './transient-logger.service';

@Injectable({ scope: Scope.REQUEST })
export class FirstRequestService {
  static COUNTER = 0;

  constructor(public readonly logger: TransientLoggerService) {
    FirstRequestService.COUNTER++;
    this.logger.setContext('FirstService');
  }
}
