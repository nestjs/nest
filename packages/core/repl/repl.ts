import { DynamicModule, Logger, Type } from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { NestFactory } from '../nest-factory';
import { assignToObject } from './assign-to-object.util';
import { REPL_INITIALIZED_MESSAGE } from './constants';
import { ReplContext } from './repl-context';
import { ReplLogger } from './repl-logger';

export interface REPLOptions {
  historyPath?: string;
}

export async function repl(
  module: Type | DynamicModule,
  options?: REPLOptions,
) {
  const logger = new ReplLogger();
  const app = await NestFactory.createApplicationContext(module, {
    abortOnError: false,
    logger,
  });
  await app.init();

  const replContext = new ReplContext(app);
  Logger.log(REPL_INITIALIZED_MESSAGE);

  const _repl = await import('repl');
  const replServer = _repl.start({
    prompt: clc.green('> '),
    ignoreUndefined: true,
  });
  if (options?.historyPath) {
    replServer.setupHistory(options.historyPath, (err: Error | null) => {
      if (err) {
        logger.error({ err }, 'error setting up repl history');
        process.exit(1);
      }
    });
  }
  assignToObject(replServer.context, replContext.globalScope);

  return replServer;
}
