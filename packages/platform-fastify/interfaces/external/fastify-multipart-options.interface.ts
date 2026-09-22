/**
 * "@fastify/multipart" plugin options, as accepted by the FastifyAdapter's
 * `multipart` option. Declared locally so the adapter's typings do not
 * require the (optional) plugin to be installed.
 *
 * `attachFieldsToBody` is deliberately left out: it consumes the body before
 * the upload interceptors from "@nestjs/platform-fastify/multipart" run.
 *
 * @see https://github.com/fastify/fastify-multipart/blob/main/types/index.d.ts
 * @publicApi
 */
export interface FastifyMultipartOptions {
  /**
   * Limits applied to every multipart request. The upload interceptors merge
   * their own `limits` over these.
   */
  limits?: {
    /**
     * Max field name size in bytes. Not enforced by the plugin for multipart
     * bodies; the upload interceptors enforce their own `limits.fieldNameSize`.
     */
    fieldNameSize?: number;
    /** Max field value size in bytes (Default: 1 MiB) */
    fieldSize?: number;
    /** Max number of non-file fields (Default: Infinity) */
    fields?: number;
    /** Max file size in bytes (Default: the Fastify `bodyLimit`, 1 MiB) */
    fileSize?: number;
    /** Max number of file fields (Default: Infinity) */
    files?: number;
    /** Max number of header key => value pairs (Default: 2000) */
    headerPairs?: number;
    /** Max number of parts, fields and files together (Default: 1000) */
    parts?: number;
  };
  /**
   * Throw when a file exceeds `limits.fileSize` while it is read through
   * `req.file()` / `req.files()`. The upload interceptors always reject such
   * a file, whatever this is set to.
   */
  throwFileSizeLimit?: boolean;
  /** Keep the full path of files instead of just the base name (Default: false) */
  preservePath?: boolean;
  /** Default character set for part header values (Default: 'latin1') */
  defParamCharset?: string;
  /** Default character set when one isn't defined (Default: 'utf8') */
  defCharset?: string;
  /**
   * Detect if a part is a file. By default a part is a file if its content
   * type is `application/octet-stream` or it has a file name.
   */
  isPartAFile?: (
    fieldName: string | undefined,
    contentType: string | undefined,
    fileName: string | undefined,
  ) => boolean;
}
