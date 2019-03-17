export enum Scope {
  DEFAULT,
  TRANSIENT,
  REQUEST,
}

export interface ScopeOptions {
  scope?: Scope;
}
