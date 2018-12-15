export enum Scope {
  DEFAULT,
  REQUEST,
  LAZY,
}

export interface ScopeOptions {
  scope?: Scope;
}
