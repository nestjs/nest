import { isSymbol, isUndefined } from '@nestjs/common/utils/shared.utils';
import { REPL_METADATA_KEY } from './constants';
import type {
  ReplMetadata,
  ReplNativeFunctionMetadata,
} from './repl.interfaces';

type ReplFnDefinition = {
  /** Function's description to display when `<function>.help` is entered. */
  fnDescription: string;

  /**
   * Function's signature following TypeScript _function type expression_ syntax.
   * @example '(token: InjectionToken) => any'
   */
  fnSignature: ReplNativeFunctionMetadata['signature'];
};

type ReplFnAliasDefinition = {
  /**
   * When the function is just an alias to another one that was registered
   * already. Note that the function with the name passed to `aliasOf` should
   * appear before this one on class methods's definition.
   */
  aliasOf: string;
};

export const makeReplFnOpt = (
  description: string,
  signature: string,
): { fnDescription: string; fnSignature: string } => ({
  fnDescription: description,
  fnSignature: signature,
});

export function ReplFn(replFnOpts: ReplFnAliasDefinition): MethodDecorator;
export function ReplFn(replFnOpts: ReplFnDefinition): MethodDecorator;
export function ReplFn(
  replFnOpts: ReplFnDefinition | ReplFnAliasDefinition,
): MethodDecorator {
  return (property: Object, methodName: string | symbol) => {
    // As we are using class's properties as the name of the global function to
    // avoid naming clashes, we won't allow symbols.
    if (isSymbol(methodName)) {
      return;
    }

    const ClassRef = property.constructor;
    const replMetadata: ReplMetadata = Reflect.getMetadata(
      REPL_METADATA_KEY,
      ClassRef,
    ) || { nativeFunctions: [] };

    if ('aliasOf' in replFnOpts) {
      if (replFnOpts.aliasOf) {
        const nativeFunction = replMetadata.nativeFunctions.find(
          ({ name }) => name === replFnOpts.aliasOf,
        );

        // If the native function was registered
        if (!isUndefined(nativeFunction)) {
          replMetadata.nativeFunctions.push({
            name: methodName,
            description: nativeFunction.description,
            signature: nativeFunction.signature,
          });
          Reflect.defineMetadata(REPL_METADATA_KEY, replMetadata, ClassRef);
        }
      }

      return;
    }

    replMetadata.nativeFunctions.push({
      name: methodName,
      description: replFnOpts.fnDescription,
      signature: replFnOpts.fnSignature,
    });
    Reflect.defineMetadata(REPL_METADATA_KEY, replMetadata, ClassRef);
  };
}
