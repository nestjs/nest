import { ConsoleLogger } from '@nestjs/common';

export class InjectorLogger extends ConsoleLogger {
  constructor() {
    super(InjectorLogger.name, { timestamp: true });
  }
  log(message: any): void {
    if (process.env.NEST_DEBUG) {
      return super.log(message);
    }
  }
}
