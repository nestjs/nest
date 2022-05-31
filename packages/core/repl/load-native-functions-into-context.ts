import * as _repl from 'repl';
import { ReplContext } from './repl-context';
import { ReplFunction } from './repl-function';
import { ReplFunctionClass } from './repl.interfaces';

export function loadNativeFunctionsIntoContext(
  replServerContext: _repl.REPLServer['context'],
  replContext: ReplContext,
) {
  const registerFunction = (
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

  const aliasesNativeFunctions = replContext.nativeFunctions
    .filter(nativeFunction => nativeFunction.fnDefinition.aliases)
    .flatMap(nativeFunction =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      nativeFunction.fnDefinition.aliases!.map(aliasFnName => {
        const aliasNativeFunction: InstanceType<ReplFunctionClass> =
          Object.create(nativeFunction);
        aliasNativeFunction.fnDefinition = {
          name: aliasFnName,
          description: aliasNativeFunction.fnDefinition.description,
          signature: aliasNativeFunction.fnDefinition.signature,
        };

        return aliasNativeFunction;
      }),
    );

  replContext.nativeFunctions.push(...aliasesNativeFunctions);
  replContext.nativeFunctions.forEach(registerFunction);
}
