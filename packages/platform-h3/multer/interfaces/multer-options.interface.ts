import { Readable } from 'stream';
import { StorageEngine } from '../storage/storage.interface';

/**
 * H3 file upload options interface.
 * Designed to be compatible with multer options structure for consistency.
 *
 * @see https://h3.unjs.io
 *
 * @publicApi
 */
export interface H3MulterOptions {
  /**
   * Storage engine for handling file persistence.
   * If not specified, files are kept in memory (buffer).
   */
  storage?: StorageEngine;

  /**
   * Destination folder for disk storage (shorthand).
   * If specified without storage, DiskStorage with this destination is used.
   */
  dest?: string;

  /**
   * An object specifying size limits for uploaded files.
   */
  limits?: {
    /** Max field name size (Default: 100 bytes) */
    fieldNameSize?: number;
    /** Max field value size (Default: 1MB) */
    fieldSize?: number;
    /** Max number of non-file fields (Default: Infinity) */
    fields?: number;
    /** For multipart forms, the max file size (in bytes) (Default: Infinity) */
    fileSize?: number;
    /** For multipart forms, the max number of file fields (Default: Infinity) */
    files?: number;
    /** For multipart forms, the max number of parts (fields + files) (Default: Infinity) */
    parts?: number;
    /** For multipart forms, the max number of header key=>value pairs to parse (Default: 2000) */
    headerPairs?: number;
  };

  /**
   * A function to control which files are accepted.
   * The function receives the file and a callback.
   * Call callback(null, true) to accept the file.
   * Call callback(error, false) to reject the file.
   */
  fileFilter?(
    req: any,
    file: H3UploadedFile,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void;

  /**
   * Whether to preserve file order from form data.
   * Default is true.
   */
  preserveOrder?: boolean;
}

/**
 * Represents an uploaded file from H3's multipart form data parsing.
 *
 * @publicApi
 */
export interface H3UploadedFile {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type of the file */
  encoding?: string;
  /** Mime type of the file */
  mimetype: string;
  /** Size of the file in bytes */
  size: number;
  /** A Buffer of the entire file (MemoryStorage) */
  buffer?: Buffer;
  /** Destination folder (DiskStorage) */
  destination?: string;
  /** Filename on disk (DiskStorage) */
  filename?: string;
  /** Full path to the file on disk (DiskStorage) */
  path?: string;
}

/**
 * Represents a file being uploaded as a stream.
 * Used for stream-based file processing.
 *
 * @publicApi
 */
export interface H3FileStream {
  /** Field name specified in the form */
  fieldname: string;
  /** Name of the file on the user's computer */
  originalname: string;
  /** Encoding type of the file */
  encoding: string;
  /** Mime type of the file */
  mimetype: string;
  /** Readable stream of file data */
  stream: Readable | ReadableStream<Uint8Array>;
}

/**
 * Represents a non-file field from multipart form data.
 *
 * @publicApi
 */
export interface H3FormField {
  /** Field name specified in the form */
  fieldname: string;
  /** Value of the field */
  value: string;
  /** Encoding type of the field value */
  encoding?: string;
  /** Mime type of the field (usually text/plain) */
  mimetype?: string;
}

/**
 * Result of parsing multipart form data with fields included.
 *
 * @publicApi
 */
export interface H3MultipartParseResult {
  /** Array of uploaded files */
  files: H3UploadedFile[];
  /** Array of form fields (non-file values) */
  fields: H3FormField[];
}

/**
 * Represents a field configuration for FileFieldsInterceptor.
 *
 * @publicApi
 */
export interface H3MulterField {
  /** The field name. */
  name: string;
  /** Optional maximum number of files per field to accept. */
  maxCount?: number;
}
