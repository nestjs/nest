export interface ExecutionContext {
  parent: Function;
  handler: (...args) => any;
}
