import { type DynamicModule, Logger, type Type } from '@nestjs/common';
import { NestFactory } from '../nest-factory.js';
import type { ReplOptions } from 'repl';
import { clc } from '@nestjs/common/internal';

export async function repl(
  module: Type | DynamicModule,
  replOptions: ReplOptions = {},
) {
  const [
    { assignToObject },
    { REPL_INITIALIZED_MESSAGE },
    { ReplContext },
    { ReplLogger },
    { defineDefaultCommandsOnRepl },
  ] = await Promise.all([
    import('./assign-to-object.util.js'),
    import('./constants.js'),
    import('./repl-context.js'),
    import('./repl-logger.js'),
    import('./repl-native-commands.js'),
  ]);
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
  // The ".clear" command replaces the context with an empty one, without the
  // native functions, the modules and the providers
  replServer.on('reset', context =>
    assignToObject(context, replContext.globalScope),
  );

  defineDefaultCommandsOnRepl(replServer);

  replServer.on('exit', async () => {
    await app.close();
  });

  return replServer;
}
