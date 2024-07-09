/**
 * Options for `StreamableFile`
 *
 * @see [Streaming files](https://docs.nestjs.com/techniques/streaming-files)
 *
 * @publicApi
 */
export interface StreamableFileOptions {
  /**
   * The value that will be used for the `Content-Type` response header.
   * @default `"application/octet-stream"`
   */
  type?: string;
  /**
   * The value that will be used for the `Content-Disposition` response header.
   */
  disposition?: string;
  /**
   * The value that will be used for the `Content-Length` response header.
   */
  length?: number;
}
