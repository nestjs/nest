import { Inject, Logger, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';

@Injectable({ scope: Scope.TRANSIENT })
export class TransientLogger {
  config: object;

  constructor(
    @Inject(INQUIRER) { constructor },
    private readonly logger: Logger,
  ) {
    this.config = (constructor && constructor.logger) || {};
  }

  log(message: string) {
    this.logger.log({ message, ...this.config });
  }
}
