import { ConsoleLogger } from '@nestjs/common';
import { NestApplication } from '../nest-application.js';
import { RouterExplorer } from '../router/router-explorer.js';
import { RoutesResolver } from '../router/routes-resolver.js';

export class ReplLogger extends ConsoleLogger {
  private static readonly ignoredContexts = [
    RoutesResolver.name,
    RouterExplorer.name,
    NestApplication.name,
  ];

  log(_message: any, context?: string) {
    if (ReplLogger.ignoredContexts.includes(context!)) {
      return;
    }
    // eslint-disable-next-line
    return super.log.apply(this, Array.from(arguments) as [any, string?]);
  }
}
