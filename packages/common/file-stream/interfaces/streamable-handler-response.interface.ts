export interface StreamableHandlerResponse {
  /** `true` if the connection is destroyed, `false` otherwise. */
  destroyed: boolean;
  /** `true` if headers were sent, `false` otherwise. */
  headersSent: boolean;
  /** The status code that will be sent to the client when the headers get flushed. */
  statusCode: number;
  /** Sends the HTTP response. */
  send: (body: string) => void;
  /** Signals to the server that all of the response headers and body have been sent. */
  end: () => void;
}
