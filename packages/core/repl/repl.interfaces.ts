/**
 * Metadata of bult-in functions that will be available on the global context of
 * the NestJS Read-Eval-Print-Loop (REPL).
 */
export interface ReplNativeFunctionMetadata {
  /** Function's name. */
  name: string;

  /** Function's description to display when `<function>.help` is entered. */
  description: string;

  /**
   * Function's signature following TypeScript _function type expression_ syntax,
   * to display when `<function>.help` is entered along with function's description.
   * @example '(token: InjectionToken) => any'
   */
  signature: string;
}

/**
 * Metadata attached to REPL context class.
 */
export interface ReplMetadata {
  nativeFunctions: ReplNativeFunctionMetadata[];
}
