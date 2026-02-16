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
  buffer: Buffer;
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
