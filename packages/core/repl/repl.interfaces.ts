import type { ReplContext } from './repl-context';
import type { ReplFunction } from './repl-function';

export type ReplFnDefinition = {
  /** Function's name. Note that this should be a valid JavaScript function name. */
  name: string;

  /** Alternative names to the function. */
  aliases?: ReplFnDefinition['name'][];

  /** Function's description to display when `<function>.help` is entered. */
  description: string;

  /**
   * Function's signature following TypeScript _function type expression_ syntax.
   * @example '(token: InjectionToken) => any'
   */
  signature: string;
};

export type ReplFunctionClass = new (replContext: ReplContext) => ReplFunction;
