/**
 * @publicApi
 */
export class BaseRpcContext<T = unknown[]> {
  constructor(protected readonly args: T) {}

  /**
   * Returns the array of arguments being passed to the handler.
   */
  getArgs(): T {
    return this.args;
  }

  /**
   * Returns a particular argument by index.
   * @param index index of argument to retrieve
   */
  getArgByIndex(index: number) {
    return this.args[index];
  }
}
