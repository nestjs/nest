/**
 * Interface describing the shape of a transport server.
 * Used as the return type of `getTransportServer()` to provide
 * autocomplete without creating circular dependencies.
 *
 * @publicApi
 */
export interface ITransportServer {
  /**
   * Starts the transport server.
   * @param callback Function to be called upon initialization
   */
  listen(callback: (...optionalParams: unknown[]) => any): any;

  /**
   * Closes the transport server (stops listening on port/connection).
   */
  close(): any;
}
