/**
 * Options for configuring shutdown hooks behavior.
 *
 * @publicApi
 */
export interface ShutdownHooksOptions {
  /**
   * If true, uses `process.exit()` instead of `process.kill(process.pid, signal)`
   * after shutdown hooks complete. This ensures the 'exit' event is properly
   * triggered, which is required for async loggers (like Pino with transports)
   * to flush their buffers before the process terminates.
   *
   * Note: Using `process.exit()` will:
   * - Change the exit code (e.g., SIGTERM: 143 → 0)
   * - May not trigger other signal handlers from third-party libraries
   * - May affect orchestrator (Kubernetes, Docker) behavior
   *
   * @default false
   */
  useProcessExit?: boolean;
}
