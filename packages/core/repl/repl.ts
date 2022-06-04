import { Logger, Type } from '@nestjs/common';
import * as _repl from 'repl';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import { NestFactory } from '../nest-factory';
import { REPL_INITIALIZED_MESSAGE } from './constants';
import { ReplContext } from './repl-context';
import { ReplLogger } from './repl-logger';

function copyInto(target, source): void {
  Object.defineProperties(
    target,
    Object.keys(source).reduce((descriptors, key) => {
      descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
      return descriptors;
    }, Object.create(null)),
  );
}

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
  copyInto(replServer.context, replContext.globalScope);

  return replServer;
}
