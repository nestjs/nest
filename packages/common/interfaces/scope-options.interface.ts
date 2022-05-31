/**
 * @publicApi
 */
export enum Scope {
  /**
   * The provider can be shared across multiple classes. The provider lifetime
   * is strictly tied to the application lifecycle. Once the application has
   * bootstrapped, all providers have been instantiated.
   */
  DEFAULT,
  /**
   * A new private instance of the provider is instantiated for every use
   */
  TRANSIENT,
  /**
   * A new instance is instantiated for each request processing pipeline
   */
  REQUEST,
}

/**
 * @publicApi
 *
 * @see [Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
 */
export interface ScopeOptions {
  /**
   * Specifies the lifetime of an injected Provider or Controller.
   */
  scope?: Scope;
  /**
   * Flags provider as durable. This flag can be used in combination with custom context id
   * factory strategy to construct lazy DI subtrees.
   *
   * This flag can be used only in conjunction with scope = Scope.REQUEST.
   */
  durable?: boolean;
}
