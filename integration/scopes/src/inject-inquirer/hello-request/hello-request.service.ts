import { Injectable, Scope } from '@nestjs/common';
import { RequestLogger } from './request-logger.service';

@Injectable({ scope: Scope.REQUEST })
export class HelloRequestService {
  static logger = { feature: 'request' };

  constructor(private readonly logger: RequestLogger) {}

  greeting() {
    this.logger.log('Hello request!');
  }

  farewell() {
    this.logger.log('Goodbye request!');
  }
}
