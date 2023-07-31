/**
 * SettlementSignal is used to signal the resolution of a provider/instance.
 * Calling `complete` or `error` will resolve the promise returned by `asPromise`.
 * Can be used to detect circular dependencies.
 */
export class SettlementSignal {
  private readonly _refs = new Set();
  private readonly settledPromise: Promise<unknown>;
  private settleFn!: (err?: unknown) => void;
  private completed = false;

  constructor() {
    this.settledPromise = new Promise<unknown>(resolve => {
      this.settleFn = resolve;
    });
  }

  /**
   * Resolves the promise returned by `asPromise`.
   */
  public complete() {
    this.completed = true;
    this.settleFn();
  }

  /**
   * Rejects the promise returned by `asPromise` with the given error.
   * @param err Error to reject the promise returned by `asPromise` with.
   */
  public error(err: unknown) {
    this.completed = true;
    this.settleFn(err);
  }

  /**
   * Returns a promise that will be resolved when `complete` or `error` is called.
   * @returns Promise that will be resolved when `complete` or `error` is called.
   */
  public asPromise() {
    return this.settledPromise;
  }

  /**
   * Inserts a wrapper id that the host of this signal depends on.
   * @param wrapperId Wrapper id to insert.
   */
  public insertRef(wrapperId: string) {
    this._refs.add(wrapperId);
  }

  /**
   * Check if relationship is circular.
   * @param wrapperId Wrapper id to check.
   * @returns True if relationship is circular, false otherwise.
   */
  public isCycle(wrapperId: string) {
    return !this.completed && this._refs.has(wrapperId);
  }
}
