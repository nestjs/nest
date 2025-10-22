import { Injectable, Scope } from '@nestjs/common';
import { TransientLoggerService } from './transient-logger.service';

@Injectable({ scope: Scope.REQUEST })
export class SecondRequestService {
  static COUNTER = 0;

  constructor(public readonly logger: TransientLoggerService) {
    SecondRequestService.COUNTER++;
    this.logger.setContext('SecondService');
  }
}
