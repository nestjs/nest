import { H3Event } from 'h3';
import {
  H3UploadedFile,
  H3MulterOptions,
  H3MulterField,
} from '../interfaces/multer-options.interface';
import { transformException, h3MultipartExceptions } from './multer.utils';

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
 *
 * @param event The H3 event containing the request
 * @param options Optional configuration for file upload limits and filtering
 * @returns Promise resolving to an array of uploaded files
 */
export async function parseMultipartFormData(
  event: H3Event,
  options?: H3MulterOptions,
): Promise<H3UploadedFile[]> {
  const files: H3UploadedFile[] = [];
  const limits = options?.limits || {};

  // Check if this is a multipart request
  if (!isMultipartRequest(event)) {
    // Not a multipart request, return empty array
    return files;
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
      }
    }

    return files;
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
