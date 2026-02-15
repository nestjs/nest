import { Injectable } from '@nestjs/common';
import { TransientLogger } from './transient-logger.service.js';

@Injectable()
export class HelloTransientService {
  static logger = { feature: 'transient' };

  constructor(private readonly logger: TransientLogger) {}

  greeting() {
    this.logger.log('Hello transient!');
  }
}
