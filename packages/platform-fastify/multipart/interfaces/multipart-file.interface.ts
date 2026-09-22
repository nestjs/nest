import type { Readable } from 'stream';

/**
 * A stored upload, in the shape multer produces (`Express.Multer.File`), so
 * `@UploadedFile()`, `ParseFilePipe` and the built-in file validators work
 * unchanged. Memory storage sets `buffer`; disk storage sets `destination`,
 * `filename` and `path`.
 *
 * @publicApi
 */
export interface UploadedMultipartFile {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type of the file */
  encoding: string;
  /** Mime type of the file */
  mimetype: string;
  /** Size of the file in bytes */
  size: number;
  /** A Buffer of the entire file (memory storage) */
  buffer?: Buffer;
  /** The folder to which the file has been saved (disk storage) */
  destination?: string;
  /** The name of the file within the destination (disk storage) */
  filename?: string;
  /** Location of the uploaded file (disk storage) */
  path?: string;
}

/**
 * What a storage engine and `fileFilter` see before the file is stored.
 *
 * @publicApi
 */
export interface IncomingMultipartFile {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type of the file */
  encoding: string;
  /** Mime type of the file */
  mimetype: string;
  /**
   * The file contents. Non-enumerable; meant to be consumed by
   * `MultipartStorageEngine._handleFile` only.
   */
  readonly stream: Readable;
}

/**
 * The file `FileStreamInterceptor` hands to the route handler. Its size is
 * not known up front.
 *
 * @publicApi
 */
export interface MultipartFileStream {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type of the file */
  encoding: string;
  /** Mime type of the file */
  mimetype: string;
  /**
   * The file contents. Errors with a `PayloadTooLargeException` once
   * `limits.fileSize` is exceeded.
   */
  stream: Readable;
}
