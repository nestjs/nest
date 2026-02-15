/**
 * A simple barrier to synchronize flow of multiple async operations.
 */
export class Barrier {
  private currentCount: number;
  private targetCount: number;
  private promise: Promise<void>;
  private resolve: () => void;

  constructor(targetCount: number) {
    this.currentCount = 0;
    this.targetCount = targetCount;

    this.promise = new Promise<void>(resolve => {
      this.resolve = resolve;
    });
  }

  /**
   * Signal that a participant has reached the barrier.
   *
   * The barrier will be resolved once `targetCount` participants have reached it.
   */
  public signal(): void {
    this.currentCount += 1;
    if (this.currentCount === this.targetCount) {
      this.resolve();
    }
  }

  /**
   * Wait for the barrier to be resolved.
   *
   * @returns A promise that resolves when the barrier is resolved.
   */
  public async wait(): Promise<void> {
    return this.promise;
  }

  /**
   * Signal that a participant has reached the barrier and wait for the barrier to be resolved.
   *
   * The barrier will be resolved once `targetCount` participants have reached it.
   *
   * @returns A promise that resolves when the barrier is resolved.
   */
  public async signalAndWait(): Promise<void> {
    this.signal();
    return this.wait();
  }
}
