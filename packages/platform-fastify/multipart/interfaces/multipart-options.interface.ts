import type {
  IncomingMultipartFile,
  UploadedMultipartFile,
} from './multipart-file.interface.js';

/**
 * multer's storage engine contract (`_handleFile` / `_removeFile`), kept
 * as-is so existing multer storage engines can be passed as `storage`.
 *
 * @publicApi
 */
export interface MultipartStorageEngine {
  _handleFile(
    req: any,
    file: IncomingMultipartFile,
    callback: (error?: any, info?: Partial<UploadedMultipartFile>) => void,
  ): void;
  _removeFile(
    req: any,
    file: UploadedMultipartFile,
    callback: (error: Error | null) => void,
  ): void;
}

/**
 * Same keys as platform-express's `MulterLimits`.
 *
 * Limits that are not set fall back to the options `@fastify/multipart` was
 * registered with, and then to its own defaults. Unlike multer (which
 * defaults `fileSize` and `parts` to `Infinity`), `@fastify/multipart` caps
 * `fileSize` at the Fastify instance's `bodyLimit` (1 MiB unless configured)
 * and `parts` at 1000.
 *
 * @publicApi
 */
export interface MultipartLimits {
  /**
   * Max field name size in bytes (Default: unlimited). Unlike the other
   * limits, it does not fall back to the options `@fastify/multipart` was
   * registered with.
   */
  fieldNameSize?: number;
  /** Max field value size (Default: 1MB) */
  fieldSize?: number;
  /** Max number of non-file fields (Default: Infinity) */
  fields?: number;
  /** For multipart forms, the max file size in bytes (Default: the Fastify `bodyLimit`, 1 MiB) */
  fileSize?: number;
  /** For multipart forms, the max number of file fields (Default: Infinity) */
  files?: number;
  /** For multipart forms, the max number of parts (fields + files) (Default: 1000) */
  parts?: number;
  /** For multipart forms, the max number of header key => value pairs to parse (Default: 2000) */
  headerPairs?: number;
}

/**
 * Same keys and semantics as platform-express's `MulterOptions`, so option
 * objects can be moved between adapters as-is.
 *
 * @publicApi
 */
export interface MultipartOptions {
  /** Where to store the files (disk storage). Ignored when `storage` is set. */
  dest?: string;
  /** The storage engine to use for uploaded files (Default: memory storage). */
  storage?: MultipartStorageEngine;
  /**
   * An object specifying the size limits, or a function of the request that
   * returns one. Merged over the limits `@fastify/multipart` was registered with.
   */
  limits?: MultipartLimits | ((req: any) => MultipartLimits);
  /** Keep the full path of files instead of just the base name (Default: false) */
  preservePath?: boolean;
  /** Default character set for part header values (e.g. filename) (Default: 'latin1') */
  defParamCharset?: string;
  /**
   * Decides which files are stored. Call `callback(null, false)` to skip a
   * file, or `callback(error, false)` to fail the request with `error`.
   */
  fileFilter?(
    req: any,
    file: IncomingMultipartFile,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void;
}

/**
 * @publicApi
 */
export interface MultipartField {
  /** The field name. */
  name: string;
  /** Optional maximum number of files per field to accept. */
  maxCount?: number;
}
