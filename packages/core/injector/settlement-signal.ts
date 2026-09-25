/**
 * A dependency of the host of a signal, as recorded by `insertRef`.
 */
interface SettlementSignalRef {
  id: string;
  settlementSignal?: SettlementSignal;
}

/**
 * SettlementSignal is used to signal the resolution of a provider/instance.
 * Calling `complete` or `error` will resolve the promise returned by `asPromise`.
 * Can be used to detect circular dependencies.
 */
export class SettlementSignal {
  private readonly _refs = new Map<string, SettlementSignalRef>();
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
   * Inserts a wrapper that the host of this signal depends on.
   * @param ref Wrapper to insert.
   */
  public insertRef(ref: SettlementSignalRef) {
    this._refs.set(ref.id, ref);
  }

  /**
   * Check if relationship is circular, i.e. whether the host of this signal
   * is still waiting, directly or through other pending dependencies, on the
   * given wrapper.
   * @param wrapperId Wrapper id to check.
   * @returns True if relationship is circular, false otherwise.
   */
  public isCycle(wrapperId: string) {
    return this.waitsOn(wrapperId, new Set());
  }

  private waitsOn(wrapperId: string, visited: Set<SettlementSignal>): boolean {
    if (this.completed || visited.has(this)) {
      return false;
    }
    visited.add(this);

    for (const [refId, ref] of this._refs) {
      if (
        refId === wrapperId ||
        ref.settlementSignal?.waitsOn(wrapperId, visited)
      ) {
        return true;
      }
    }
    return false;
  }
}
