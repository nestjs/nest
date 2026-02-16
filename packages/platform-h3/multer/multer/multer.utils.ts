import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';

/**
 * Error messages for H3 multipart file upload handling.
 */
export const h3MultipartExceptions = {
  LIMIT_FILE_SIZE: 'File too large',
  LIMIT_FILE_COUNT: 'Too many files',
  LIMIT_FIELD_KEY: 'Field name too long',
  LIMIT_FIELD_VALUE: 'Field value too long',
  LIMIT_FIELD_COUNT: 'Too many fields',
  LIMIT_UNEXPECTED_FILE: 'Unexpected field',
  LIMIT_PART_COUNT: 'Too many parts',
  MISSING_FIELD_NAME: 'Field name missing',
  MULTIPART_BOUNDARY_NOT_FOUND: 'Boundary not found',
  MULTIPART_MALFORMED_PART_HEADER: 'Malformed part header',
  MULTIPART_UNEXPECTED_END_OF_FORM: 'Unexpected end of form',
  MULTIPART_UNEXPECTED_END_OF_FILE: 'Unexpected end of file',
  MULTIPART_NO_BODY: 'No body provided',
  MULTIPART_INVALID_CONTENT_TYPE: 'Invalid content type for multipart',
};

/**
 * Transforms multipart parsing errors into appropriate HTTP exceptions.
 *
 * @param error The error to transform
 * @returns An appropriate HttpException or the original error
 */
export function transformException(
  error: (Error & { field?: string }) | undefined,
): Error | undefined {
  if (!error || error instanceof HttpException) {
    return error;
  }

  const message = error.message;

  switch (message) {
    case h3MultipartExceptions.LIMIT_FILE_SIZE:
      return new PayloadTooLargeException(message);
    case h3MultipartExceptions.LIMIT_FILE_COUNT:
    case h3MultipartExceptions.LIMIT_FIELD_KEY:
    case h3MultipartExceptions.LIMIT_FIELD_VALUE:
    case h3MultipartExceptions.LIMIT_FIELD_COUNT:
    case h3MultipartExceptions.LIMIT_UNEXPECTED_FILE:
    case h3MultipartExceptions.LIMIT_PART_COUNT:
    case h3MultipartExceptions.MISSING_FIELD_NAME:
      if (error.field) {
        return new BadRequestException(`${message} - ${error.field}`);
      }
      return new BadRequestException(message);
    case h3MultipartExceptions.MULTIPART_BOUNDARY_NOT_FOUND:
    case h3MultipartExceptions.MULTIPART_NO_BODY:
    case h3MultipartExceptions.MULTIPART_INVALID_CONTENT_TYPE:
      return new BadRequestException(message);
    case h3MultipartExceptions.MULTIPART_MALFORMED_PART_HEADER:
    case h3MultipartExceptions.MULTIPART_UNEXPECTED_END_OF_FORM:
    case h3MultipartExceptions.MULTIPART_UNEXPECTED_END_OF_FILE:
      return new BadRequestException(`Multipart: ${message}`);
  }

  return error;
}
