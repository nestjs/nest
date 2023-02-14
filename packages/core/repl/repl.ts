import { DynamicModule, Logger, Type } from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { NestFactory } from '../nest-factory';
import { assignToObject } from './assign-to-object.util';
import { REPL_INITIALIZED_MESSAGE } from './constants';
import { ReplContext } from './repl-context';
import { ReplLogger } from './repl-logger';
import { defineDefaultCommandsOnRepl } from './repl-native-commands';

export async function repl(module: Type | DynamicModule) {
  const app = await NestFactory.createApplicationContext(module, {
    abortOnError: false,
    logger: new ReplLogger(),
  });
  await app.init();

  const replContext = new ReplContext(app);
  Logger.log(REPL_INITIALIZED_MESSAGE);

  const _repl = await import('repl');
  const replServer = _repl.start({
    prompt: clc.green('> '),
    ignoreUndefined: true,
  });
  assignToObject(replServer.context, replContext.globalScope);

  defineDefaultCommandsOnRepl(replServer);

  return replServer;
}
