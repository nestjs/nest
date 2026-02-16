import {
  H3UploadedFile,
  H3FileStream,
} from '../interfaces/multer-options.interface';

/**
 * Callback function for storage operations.
 * @param error - Error if operation failed, null otherwise
 * @param info - Additional file information after storage operation
 */
export type StorageCallback = (
  error: Error | null,
  info?: Partial<H3UploadedFile>,
) => void;

/**
 * Callback for removing files from storage.
 * @param error - Error if removal failed, null otherwise
 */
export type RemoveCallback = (error: Error | null) => void;

/**
 * Storage engine interface for handling file persistence.
 * Compatible with multer storage engine pattern.
 *
 * @publicApi
 */
export interface StorageEngine {
  /**
   * Handle file storage. Called for each uploaded file.
   *
   * @param req - The request object
   * @param file - The uploaded file (buffer-based or stream-based)
   * @param callback - Callback to invoke when storage is complete
   */
  _handleFile(
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: StorageCallback,
  ): void;

  /**
   * Remove a stored file.
   *
   * @param req - The request object
   * @param file - The file to remove
   * @param callback - Callback to invoke when removal is complete
   */
  _removeFile(req: any, file: H3UploadedFile, callback: RemoveCallback): void;
}

/**
 * Options for disk storage configuration.
 *
 * @publicApi
 */
export interface DiskStorageOptions {
  /**
   * Destination folder for uploaded files.
   * Can be a string path or a function that determines the path per file.
   */
  destination?:
    | string
    | ((
        req: any,
        file: H3UploadedFile | H3FileStream,
        callback: (error: Error | null, destination: string) => void,
      ) => void);

  /**
   * Function to determine the filename for each uploaded file.
   * If not provided, a random name will be generated.
   */
  filename?: (
    req: any,
    file: H3UploadedFile | H3FileStream,
    callback: (error: Error | null, filename: string) => void,
  ) => void;
}

/**
 * Options for memory storage configuration.
 *
 * @publicApi
 */
// Currently no options needed, but interface exists for future extensions
export type MemoryStorageOptions = object;
