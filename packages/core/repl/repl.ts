import { Logger, Type } from '@nestjs/common';
import { clc } from '@nestjs/common/utils/cli-colors.util';
import * as _repl from 'repl';
import { NestFactory } from '../nest-factory';
import { REPL_INITIALIZED_MESSAGE, REPL_METADATA_KEY } from './constants';
import { ReplContext as CoreReplContext, ReplContext } from './repl-context';
import { ReplLogger } from './repl-logger';
import { ReplMetadata } from './repl.interfaces';

/** Utility to build help messages for NestJS REPL native functions. */
const makeHelpMessage = (
  description: string,
  fnSignatureWithName: string,
): string =>
  `${clc.yellow(description)}\n${clc.magentaBright('Interface:')} ${clc.bold(
    fnSignatureWithName,
  )}\n`;

function loadNativeFunctionsOnContext(
  replServerContext: _repl.REPLServer['context'],
  replContext: ReplContext,
  replMetadata: ReplMetadata,
) {
  replMetadata.nativeFunctions.forEach(nativeFunction => {
    const functionRef: Function = replContext[nativeFunction.name];
    if (!functionRef) return;

    // Bind the method to REPL's context:
    const functionBoundRef = (replServerContext[nativeFunction.name] =
      functionRef.bind(replContext));

    // Load the help trigger as a `help` getter on each native function:
    Object.defineProperty(functionBoundRef, 'help', {
      enumerable: false,
      configurable: false,
      get: () => {
        // Lazy building the help message as will unlikely to be called often,
        // and we can keep the closure context smaller just for this task.
        const helpMessage = makeHelpMessage(
          nativeFunction.description,
          `${nativeFunction.name}${nativeFunction.signature}`,
        );
        replContext.writeToStdout(helpMessage);
      },
    });
  });
}

export async function repl(module: Type) {
  const app = await NestFactory.create(module, {
    abortOnError: false,
    logger: new ReplLogger(),
  });
  await app.init();

  const ReplContext = CoreReplContext;
  const replContext = new ReplContext(app);
  Logger.log(REPL_INITIALIZED_MESSAGE);

  const replServer = _repl.start({
    prompt: '\x1b[32m>\x1b[0m ',
    ignoreUndefined: true,
  });

  const replMetadata: ReplMetadata = Reflect.getMetadata(
    REPL_METADATA_KEY,
    ReplContext,
  );
  loadNativeFunctionsOnContext(replServer.context, replContext, replMetadata);

  return replServer;
}
