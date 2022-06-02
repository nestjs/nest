import { Logger, Type } from '@nestjs/common';
import * as _repl from 'repl';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { NestFactory } from '../nest-factory';
import { REPL_INITIALIZED_MESSAGE } from './constants';
import { loadNativeFunctionsIntoContext } from './load-native-functions-into-context';
import { ReplContext } from './repl-context';
import { ReplLogger } from './repl-logger';

export async function repl(module: Type) {
  const app = await NestFactory.create(module, {
    abortOnError: false,
    logger: new ReplLogger(),
  });
  await app.init();

  const replContext = new ReplContext(app);
  Logger.log(REPL_INITIALIZED_MESSAGE);

  const replServer = _repl.start({
    prompt: clc.green('> '),
    ignoreUndefined: true,
  });

  loadNativeFunctionsIntoContext(replServer.context, replContext);

  return replServer;
}
