/**
 * The process events that report fatal errors.
 *
 * @publicApi
 */
export type ProcessErrorOrigin = 'uncaughtException' | 'unhandledRejection';

/**
 * Options for configuring the shutdown triggered by a fatal error.
 *
 * @publicApi
 */
export interface FatalErrorShutdownOptions {
  /**
   * Exit code passed to `process.exit()` once the shutdown sequence completes.
   *
   * @default 1
   */
  exitCode?: number;

  /**
   * Maximum time (in milliseconds) to wait for the shutdown sequence
   * before exiting anyway.
   *
   * @default 5000
   */
  timeout?: number;
}

/**
 * Context passed to a process error handler.
 *
 * @publicApi
 */
export interface ProcessErrorContext {
  /**
   * The process event that reported the error.
   */
  origin: ProcessErrorOrigin;

  /**
   * Runs the shutdown sequence (`onModuleDestroy`, `beforeApplicationShutdown`,
   * `onApplicationShutdown`) and exits the process. Never resolves. Hooks
   * receive `origin` as their `signal` argument, not a `ShutdownSignal`.
   *
   * When the handler returns without calling it, the process keeps running.
   */
  shutdown(options?: FatalErrorShutdownOptions): Promise<never>;
}

/**
 * @publicApi
 */
export type ProcessErrorHandler = (
  error: unknown,
  context: ProcessErrorContext,
) => void | Promise<void>;

/**
 * Options for configuring process error handlers.
 *
 * @publicApi
 */
export interface ProcessErrorHandlersOptions {
  /**
   * Called when the process emits `uncaughtException`.
   *
   * Node.js documents resuming normally after an uncaught exception as
   * unsafe, since the process may be in an undefined state. The handler
   * is expected to call `context.shutdown()` rather than return without it.
   */
  uncaughtException?: ProcessErrorHandler;

  /**
   * Called when the process emits `unhandledRejection`.
   *
   * Unlike `uncaughtException`, nothing was left mid-flight here, so a
   * handler that only logs the error and returns without calling
   * `context.shutdown()` is a reasonable choice.
   */
  unhandledRejection?: ProcessErrorHandler;
}
