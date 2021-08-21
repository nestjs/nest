import { Logger } from '@nestjs/common';

export class InjectorLogger extends Logger {
  constructor() {
    super(InjectorLogger.name, { timestamp: true });
  }
  log(message: any, context?: string): void {
    if (process.env.DEBUG) {
      super.log(message, context);
    }
  }
}
