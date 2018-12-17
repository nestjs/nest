export enum Scope {
  DEFAULT,
  REQUEST,
  /** @experimental */
  LAZY_ASYNC,
}

export interface ScopeOptions {
  scope?: Scope;
}
