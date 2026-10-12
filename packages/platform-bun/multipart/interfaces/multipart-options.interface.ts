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
 * Same keys as platform-express's `MulterLimits`, with multer's defaults
 * (every limit unset means unlimited). Bun's `Request.formData()` parses
 * the whole body first, so limits are checked on the parsed parts: the
 * request body as a whole is capped by `Bun.serve`'s `maxRequestBodySize`
 * (see the `BunAdapter` `serve` option, 128 MiB by default).
 *
 * @publicApi
 */
export interface MultipartLimits {
  /** Max field name size in bytes (Default: unlimited) */
  fieldNameSize?: number;
  /** Max field value size in bytes (Default: unlimited) */
  fieldSize?: number;
  /** Max number of non-file fields (Default: Infinity) */
  fields?: number;
  /** For multipart forms, the max file size in bytes (Default: Infinity) */
  fileSize?: number;
  /** For multipart forms, the max number of file fields (Default: Infinity) */
  files?: number;
  /** For multipart forms, the max number of parts (fields + files) (Default: Infinity) */
  parts?: number;
  /** Accepted for compatibility; Bun's parser does not expose header pairs. */
  headerPairs?: number;
  /** Max nesting depth of field names; `a[b][c]` has 2 levels (Default: Infinity) */
  fieldNestingDepth?: number;
  /** Max numeric array index accepted in field names; `a[3]` uses index 3 (Default: Infinity) */
  fieldArrayIndexLimit?: number;
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
   * returns one.
   */
  limits?: MultipartLimits | ((req: any) => MultipartLimits);
  /** Keep the full path of files instead of just the base name (Default: false) */
  preservePath?: boolean;
  /** Accepted for compatibility; Bun decodes part headers as UTF-8. */
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
