import { H3Event } from 'h3';
import {
  H3UploadedFile,
  H3MulterOptions,
  H3MulterField,
  H3FormField,
  H3MultipartParseResult,
} from '../interfaces/multer-options.interface';
import { transformException, h3MultipartExceptions } from './multer.utils';
import { StorageEngine } from '../storage/storage.interface';
import { DiskStorage } from '../storage/disk.storage';

/**
 * Checks if the request has multipart/form-data content type.
 *
 * @param event The H3 event containing the request
 * @returns true if the request is multipart/form-data
 */
export function isMultipartRequest(event: H3Event): boolean {
  const contentType = event.runtime?.node?.req?.headers?.['content-type'] || '';
  return contentType.includes('multipart/form-data');
}

/**
 * Parses multipart form data from an H3 event and extracts files.
 * This is the legacy function that only returns files.
 * Use parseMultipartFormDataWithFields for both files and fields.
 *
 * @param event The H3 event containing the request
 * @param options Optional configuration for file upload limits and filtering
 * @returns Promise resolving to an array of uploaded files
 */
export async function parseMultipartFormData(
  event: H3Event,
  options?: H3MulterOptions,
): Promise<H3UploadedFile[]> {
  const result = await parseMultipartFormDataWithFields(event, options);
  return result.files;
}

/**
 * Parses multipart form data from an H3 event and extracts both files and form fields.
 *
 * @param event The H3 event containing the request
 * @param options Optional configuration for file upload limits, storage, and filtering
 * @returns Promise resolving to files and fields
 *
 * @publicApi
 */
export async function parseMultipartFormDataWithFields(
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

  // Check if this is a multipart request
  if (!isMultipartRequest(event)) {
    // Not a multipart request, return empty result
    return { files, fields };
  }

  try {
    // Use the native H3 way to read form data
    const formData = await event.req.formData();

    let fileCount = 0;
    let fieldCount = 0;
    let partCount = 0;

    for (const [fieldName, value] of formData.entries()) {
      partCount++;

      // Check parts limit
      if (limits.parts !== undefined && partCount > limits.parts) {
        const error = new Error(h3MultipartExceptions.LIMIT_PART_COUNT);
        throw transformException(error);
      }

      // Check field name size limit
      if (
        limits.fieldNameSize !== undefined &&
        Buffer.byteLength(fieldName) > limits.fieldNameSize
      ) {
        const error = new Error(
          h3MultipartExceptions.LIMIT_FIELD_KEY,
        ) as Error & { field?: string };
        error.field = fieldName;
        throw transformException(error);
      }

      if (value instanceof File) {
        // It's a file
        fileCount++;

        // Check files limit
        if (limits.files !== undefined && fileCount > limits.files) {
          const error = new Error(h3MultipartExceptions.LIMIT_FILE_COUNT);
          throw transformException(error);
        }

        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Check file size limit
        if (limits.fileSize !== undefined && buffer.length > limits.fileSize) {
          const error = new Error(h3MultipartExceptions.LIMIT_FILE_SIZE);
          throw transformException(error);
        }

        const file: H3UploadedFile = {
          fieldname: fieldName,
          originalname: value.name,
          mimetype: value.type || 'application/octet-stream',
          size: buffer.length,
          buffer,
        };

        // Apply file filter if provided
        if (options?.fileFilter) {
          const accepted = await new Promise<boolean>((resolve, reject) => {
            options.fileFilter!(
              event.req,
              file,
              (error: Error | null, accept: boolean) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(accept);
                }
              },
            );
          });

          if (!accepted) {
            continue; // Skip this file
          }
        }

        // Apply storage engine if provided
        if (storage) {
          await new Promise<void>((resolve, reject) => {
            storage._handleFile(event.req, file, (error, info) => {
              if (error) {
                reject(error);
              } else if (info) {
                // Merge storage info into file
                Object.assign(file, info);
                resolve();
              } else {
                resolve();
              }
            });
          });
        }

        files.push(file);
      } else {
        // It's a field value (string)
        fieldCount++;

        // Check fields limit
        if (limits.fields !== undefined && fieldCount > limits.fields) {
          const error = new Error(h3MultipartExceptions.LIMIT_FIELD_COUNT);
          throw transformException(error);
        }

        // Check field value size limit
        if (
          limits.fieldSize !== undefined &&
          Buffer.byteLength(value) > limits.fieldSize
        ) {
          const error = new Error(
            h3MultipartExceptions.LIMIT_FIELD_VALUE,
          ) as Error & { field?: string };
          error.field = fieldName;
          throw transformException(error);
        }

        // Store the field value
        fields.push({
          fieldname: fieldName,
          value: value,
        });
      }
    }

    return { files, fields };
  } catch (error) {
    if (error instanceof Error) {
      throw transformException(error);
    }
    throw error;
  }
}

/**
 * Filters files by a specific field name.
 *
 * @param files Array of uploaded files
 * @param fieldName The field name to filter by
 * @returns Files matching the field name
 */
export function filterFilesByFieldName(
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
export function groupFilesByFields(
  files: H3UploadedFile[],
  fields: H3MulterField[],
): Record<string, H3UploadedFile[]> {
  const result: Record<string, H3UploadedFile[]> = {};

  for (const field of fields) {
    const fieldFiles = files.filter(file => file.fieldname === field.name);

    // Apply maxCount limit if specified
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
