import { Logger, Type } from '@nestjs/common';
import * as _repl from 'repl';
import { NestFactory } from '../nest-factory';
import { REPL_INITIALIZED_MESSAGE } from './constants';
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
    prompt: '\x1b[32m>\x1b[0m ',
    ignoreUndefined: true,
  });

  replServer.context.$ = replContext.$.bind(replContext);
  replServer.context.get = replContext.get.bind(replContext);
  replServer.context.resolve = replContext.resolve.bind(replContext);
  replServer.context.select = replContext.select.bind(replContext);
  replServer.context.debug = replContext.debug.bind(replContext);
  replServer.context.methods = replContext.methods.bind(replContext);

  return replServer;
}
