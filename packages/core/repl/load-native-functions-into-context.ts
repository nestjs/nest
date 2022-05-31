import * as _repl from 'repl';
import { ReplContext } from './repl-context';
import { ReplFunction } from './repl-function';
import { ReplFunctionClass } from './repl.interfaces';

export function loadNativeFunctionsIntoContext(
  replServerContext: _repl.REPLServer['context'],
  replContext: ReplContext,
) {
  const registerFunctionToReplServerContext = (
    nativeFunction: InstanceType<ReplFunctionClass>,
  ): void => {
    // Bind the method to REPL's context:
    replServerContext[nativeFunction.fnDefinition.name] =
      nativeFunction.action.bind(nativeFunction);

    // Load the help trigger as a `help` getter on each native function:
    const functionBoundRef: ReplFunction['action'] =
      replServerContext[nativeFunction.fnDefinition.name];
    Object.defineProperty(functionBoundRef, 'help', {
      enumerable: false,
      configurable: false,
      get: () =>
        // Dynamically builds the help message as will unlikely to be called
        // several times.
        replContext.writeToStdout(nativeFunction.makeHelpMessage()),
    });
  };

  for (const [, nativeFunction] of replContext.nativeFunctions) {
    registerFunctionToReplServerContext(nativeFunction);
  }
}
