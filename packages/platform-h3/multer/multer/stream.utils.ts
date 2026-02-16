import { Readable, PassThrough } from 'stream';
import { H3Event } from 'h3';
import Busboy from '@fastify/busboy';
import {
  H3UploadedFile,
  H3FileStream,
  H3MulterOptions,
  H3MulterField,
  H3FormField,
  H3MultipartParseResult,
} from '../interfaces/multer-options.interface';
import { transformException, h3MultipartExceptions } from './multer.utils';
import { StorageEngine } from '../storage/storage.interface';
import { DiskStorage } from '../storage/disk.storage';

// Type definitions for Busboy
interface BusboyFileInfo {
  filename: string;
  encoding: string;
  mimeType: string;
}

interface BusboyFieldInfo {
  encoding: string;
  mimeType: string;
}

/**
 * Parses multipart form data from an H3 event using @fastify/busboy.
 * Returns files and form fields with stream-based processing.
 *
 * @param event The H3 event containing the request
 * @param options Optional configuration for file upload limits, storage, and filtering
 * @returns Promise resolving to files and fields
 *
 * @publicApi
 */
export async function parseMultipartWithBusboy(
  event: H3Event,
  options?: H3MulterOptions,
): Promise<H3MultipartParseResult> {
  const files: H3UploadedFile[] = [];
  const fields: H3FormField[] = [];
  const limits = options?.limits || {};

  // Determine storage engine
  let storage: StorageEngine | undefined = options?.storage;
  if (!storage && options?.dest) {
    storage = new DiskStorage({ destination: options.dest });
  }

  const nodeReq = event.runtime?.node?.req;
  if (!nodeReq) {
    return { files, fields };
  }

  const contentType = nodeReq.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return { files, fields };
  }

  return new Promise((resolve, reject) => {
    let fileCount = 0;
    let fieldCount = 0;
    let partCount = 0;
    const pendingFiles: Promise<void>[] = [];

    const busboy = Busboy({
      headers: nodeReq.headers as {
        'content-type': string;
        [key: string]: string | string[] | undefined;
      },
      limits: {
        fieldNameSize: limits.fieldNameSize ?? 100,
        fieldSize: limits.fieldSize ?? 1024 * 1024, // 1MB
        fields: limits.fields,
        fileSize: limits.fileSize,
        files: limits.files,
        parts: limits.parts,
        headerPairs: limits.headerPairs ?? 2000,
      },
    });

    busboy.on(
      'file',
      (fieldname: string, fileStream: Readable, info: BusboyFileInfo) => {
        const { filename, encoding, mimeType } = info;
        fileCount++;
        partCount++;

        // Check files limit
        if (limits.files !== undefined && fileCount > limits.files) {
          fileStream.resume(); // Drain the stream
          const error = new Error(h3MultipartExceptions.LIMIT_FILE_COUNT);
          return reject(transformException(error));
        }

        // Check parts limit
        if (limits.parts !== undefined && partCount > limits.parts) {
          fileStream.resume();
          const error = new Error(h3MultipartExceptions.LIMIT_PART_COUNT);
          return reject(transformException(error));
        }

        const filePromise = processFile(
          event.req,
          fieldname,
          fileStream,
          filename,
          encoding,
          mimeType,
          storage,
          limits,
          options,
        )
          .then(file => {
            if (file) {
              files.push(file);
            }
          })
          .catch(err => {
            reject(transformException(err));
          });

        pendingFiles.push(filePromise);
      },
    );

    busboy.on(
      'field',
      (fieldname: string, value: string, info: BusboyFieldInfo) => {
        const { encoding, mimeType } = info;
        fieldCount++;
        partCount++;

        // Check fields limit
        if (limits.fields !== undefined && fieldCount > limits.fields) {
          const error = new Error(h3MultipartExceptions.LIMIT_FIELD_COUNT);
          return reject(transformException(error));
        }

        // Check parts limit
        if (limits.parts !== undefined && partCount > limits.parts) {
          const error = new Error(h3MultipartExceptions.LIMIT_PART_COUNT);
          return reject(transformException(error));
        }

        // Check field value size limit
        if (
          limits.fieldSize !== undefined &&
          Buffer.byteLength(value) > limits.fieldSize
        ) {
          const error = new Error(
            h3MultipartExceptions.LIMIT_FIELD_VALUE,
          ) as Error & { field?: string };
          error.field = fieldname;
          return reject(transformException(error));
        }

        fields.push({
          fieldname,
          value,
          encoding,
          mimetype: mimeType,
        });
      },
    );

    busboy.on('error', (err: Error) => {
      reject(transformException(err));
    });

    busboy.on('close', async () => {
      try {
        await Promise.all(pendingFiles);
        resolve({ files, fields });
      } catch (err) {
        reject(err);
      }
    });

    // Handle file size limit exceeded
    busboy.on('filesLimit', () => {
      const error = new Error(h3MultipartExceptions.LIMIT_FILE_COUNT);
      reject(transformException(error));
    });

    busboy.on('fieldsLimit', () => {
      const error = new Error(h3MultipartExceptions.LIMIT_FIELD_COUNT);
      reject(transformException(error));
    });

    busboy.on('partsLimit', () => {
      const error = new Error(h3MultipartExceptions.LIMIT_PART_COUNT);
      reject(transformException(error));
    });

    // Pipe the request to busboy
    nodeReq.pipe(busboy);
  });
}

/**
 * Process a single file from the stream.
 */
async function processFile(
  req: any,
  fieldname: string,
  fileStream: Readable,
  filename: string,
  encoding: string,
  mimeType: string,
  storage: StorageEngine | undefined,
  limits: H3MulterOptions['limits'],
  options?: H3MulterOptions,
): Promise<H3UploadedFile | null> {
  // Buffer the file to check size and apply filter
  const chunks: Buffer[] = [];
  let size = 0;
  let limitExceeded = false;

  return new Promise((resolve, reject) => {
    fileStream.on('data', (chunk: Buffer) => {
      size += chunk.length;

      // Check file size limit
      if (limits?.fileSize !== undefined && size > limits.fileSize) {
        limitExceeded = true;
        fileStream.destroy();
        const error = new Error(h3MultipartExceptions.LIMIT_FILE_SIZE);
        reject(transformException(error));
        return;
      }

      chunks.push(chunk);
    });

    fileStream.on('error', (err: Error) => {
      reject(err);
    });

    fileStream.on('close', async () => {
      if (limitExceeded) {
        return;
      }

      // Handle empty file (no filename means no file was selected)
      if (!filename) {
        resolve(null);
        return;
      }

      const buffer = Buffer.concat(chunks);

      const file: H3UploadedFile = {
        fieldname,
        originalname: filename,
        encoding,
        mimetype: mimeType || 'application/octet-stream',
        size: buffer.length,
        buffer,
      };

      // Apply file filter if provided
      if (options?.fileFilter) {
        const accepted = await new Promise<boolean>(
          (filterResolve, filterReject) => {
            options.fileFilter!(
              req,
              file,
              (error: Error | null, accept: boolean) => {
                if (error) {
                  filterReject(error);
                } else {
                  filterResolve(accept);
                }
              },
            );
          },
        );

        if (!accepted) {
          resolve(null);
          return;
        }
      }

      // Apply storage engine if provided
      if (storage) {
        await new Promise<void>((storageResolve, storageReject) => {
          storage._handleFile(req, file, (error, info) => {
            if (error) {
              storageReject(error);
            } else if (info) {
              // Merge storage info into file
              Object.assign(file, info);
              storageResolve();
            } else {
              storageResolve();
            }
          });
        });
      }

      resolve(file);
    });
  });
}

/**
 * Parses multipart form data as streams for large file handling.
 * Returns file streams instead of buffering files in memory.
 *
 * @param event The H3 event containing the request
 * @param onFile Callback for each file stream
 * @param onField Callback for each form field
 * @param options Optional configuration for limits
 * @returns Promise resolving when parsing is complete
 *
 * @publicApi
 */
export async function parseMultipartAsStreams(
  event: H3Event,
  onFile: (file: H3FileStream) => void | Promise<void>,
  onField?: (field: H3FormField) => void | Promise<void>,
  options?: H3MulterOptions,
): Promise<void> {
  const limits = options?.limits || {};

  const nodeReq = event.runtime?.node?.req;
  if (!nodeReq) {
    return;
  }

  const contentType = nodeReq.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return;
  }

  return new Promise((resolve, reject) => {
    let fileCount = 0;
    let fieldCount = 0;
    let partCount = 0;
    const pendingCallbacks: Promise<void>[] = [];

    const busboy = Busboy({
      headers: nodeReq.headers as {
        'content-type': string;
        [key: string]: string | string[] | undefined;
      },
      limits: {
        fieldNameSize: limits.fieldNameSize ?? 100,
        fieldSize: limits.fieldSize ?? 1024 * 1024,
        fields: limits.fields,
        fileSize: limits.fileSize,
        files: limits.files,
        parts: limits.parts,
        headerPairs: limits.headerPairs ?? 2000,
      },
    });

    busboy.on(
      'file',
      (fieldname: string, fileStream: Readable, info: BusboyFileInfo) => {
        const { filename, encoding, mimeType } = info;
        fileCount++;
        partCount++;

        if (limits.files !== undefined && fileCount > limits.files) {
          fileStream.resume();
          const error = new Error(h3MultipartExceptions.LIMIT_FILE_COUNT);
          return reject(transformException(error));
        }

        if (!filename) {
          fileStream.resume();
          return;
        }

        // Create a PassThrough stream so we can pass it to the callback
        const passThrough = new PassThrough();
        fileStream.pipe(passThrough);

        const fileStreamObj: H3FileStream = {
          fieldname,
          originalname: filename,
          encoding,
          mimetype: mimeType || 'application/octet-stream',
          stream: passThrough,
        };

        const callbackResult = onFile(fileStreamObj);
        if (callbackResult instanceof Promise) {
          pendingCallbacks.push(callbackResult);
        }
      },
    );

    busboy.on(
      'field',
      (fieldname: string, value: string, info: BusboyFieldInfo) => {
        const { encoding, mimeType } = info;
        fieldCount++;
        partCount++;

        if (limits.fields !== undefined && fieldCount > limits.fields) {
          const error = new Error(h3MultipartExceptions.LIMIT_FIELD_COUNT);
          return reject(transformException(error));
        }

        if (onField) {
          const field: H3FormField = {
            fieldname,
            value,
            encoding,
            mimetype: mimeType,
          };

          const callbackResult = onField(field);
          if (callbackResult instanceof Promise) {
            pendingCallbacks.push(callbackResult);
          }
        }
      },
    );

    busboy.on('error', (err: Error) => {
      reject(transformException(err));
    });

    busboy.on('close', async () => {
      try {
        await Promise.all(pendingCallbacks);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    nodeReq.pipe(busboy);
  });
}

/**
 * Filters files by a specific field name.
 *
 * @param files Array of uploaded files
 * @param fieldName The field name to filter by
 * @returns Files matching the field name
 */
export function filterFilesByFieldNameStream(
  files: H3UploadedFile[],
  fieldName: string,
): H3UploadedFile[] {
  return files.filter(file => file.fieldname === fieldName);
}

/**
 * Groups files by their field names based on the provided field configuration.
 *
 * @param files Array of uploaded files
 * @param fields Array of field configurations
 * @returns Object with field names as keys and arrays of files as values
 */
export function groupFilesByFieldsStream(
  files: H3UploadedFile[],
  fields: H3MulterField[],
): Record<string, H3UploadedFile[]> {
  const result: Record<string, H3UploadedFile[]> = {};

  for (const field of fields) {
    const fieldFiles = files.filter(file => file.fieldname === field.name);

    if (field.maxCount !== undefined && fieldFiles.length > field.maxCount) {
      const error = new Error(
        h3MultipartExceptions.LIMIT_FILE_COUNT,
      ) as Error & { field?: string };
      error.field = field.name;
      throw transformException(error);
    }

    result[field.name] = fieldFiles;
  }

  return result;
}

/**
 * Filters form fields by a specific field name.
 *
 * @param fields Array of form fields
 * @param fieldName The field name to filter by
 * @returns Fields matching the field name
 */
export function filterFormFieldsByName(
  fields: H3FormField[],
  fieldName: string,
): H3FormField[] {
  return fields.filter(field => field.fieldname === fieldName);
}

/**
 * Converts an array of form fields to a key-value object.
 * If multiple fields have the same name, they are collected into an array.
 *
 * @param fields Array of form fields
 * @returns Object with field names as keys and values (string or string[])
 */
export function fieldsToObject(
  fields: H3FormField[],
): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  for (const field of fields) {
    const existing = result[field.fieldname];
    if (existing === undefined) {
      result[field.fieldname] = field.value;
    } else if (Array.isArray(existing)) {
      existing.push(field.value);
    } else {
      result[field.fieldname] = [existing, field.value];
    }
  }

  return result;
}
