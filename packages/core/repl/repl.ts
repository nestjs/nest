import { type DynamicModule, Logger, type Type } from '@nestjs/common';
import { NestFactory } from '../nest-factory.js';
import { assignToObject } from './assign-to-object.util.js';
import { REPL_INITIALIZED_MESSAGE } from './constants.js';
import { ReplContext } from './repl-context.js';
import { ReplLogger } from './repl-logger.js';
import { defineDefaultCommandsOnRepl } from './repl-native-commands.js';
import type { ReplOptions } from 'repl';
import { clc } from '@nestjs/common/internal';

export async function repl(
  module: Type | DynamicModule,
  replOptions: ReplOptions = {},
) {
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
    ...replOptions,
  });
  assignToObject(replServer.context, replContext.globalScope);

  defineDefaultCommandsOnRepl(replServer);

  replServer.on('exit', async () => {
    await app.close();
  });

  return replServer;
}
