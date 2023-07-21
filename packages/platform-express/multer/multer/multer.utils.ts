import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { multerExceptions, busboyExceptions } from './multer.constants';

const {
  LIMIT_FILE_SIZE,
  LIMIT_FILE_COUNT,
  LIMIT_FIELD_KEY,
  LIMIT_FIELD_VALUE,
  LIMIT_FIELD_COUNT,
  LIMIT_UNEXPECTED_FILE,
  LIMIT_PART_COUNT,
  MISSING_FIELD_NAME,
} = multerExceptions;
const {
  MULTIPART_BOUNDARY_NOT_FOUND,
  MULTIPART_MALFORMED_PART_HEADER,
  MULTIPART_UNEXPECTED_END_OF_FORM,
  MULTIPART_UNEXPECTED_END_OF_FILE,
} = busboyExceptions;

export function transformException(error: Error | undefined) {
  if (!error || error instanceof HttpException) {
    return error;
  }
  switch (error.message) {
    case LIMIT_FILE_SIZE:
      return new PayloadTooLargeException(error.message);
    case LIMIT_FILE_COUNT:
    case LIMIT_FIELD_KEY:
    case LIMIT_FIELD_VALUE:
    case LIMIT_FIELD_COUNT:
    case LIMIT_UNEXPECTED_FILE:
    case LIMIT_PART_COUNT:
    case MISSING_FIELD_NAME:
      return new BadRequestException(error.message);
    case MULTIPART_BOUNDARY_NOT_FOUND:
      return new BadRequestException(error.message);
    case MULTIPART_MALFORMED_PART_HEADER:
    case MULTIPART_UNEXPECTED_END_OF_FORM:
    case MULTIPART_UNEXPECTED_END_OF_FILE:
      return new BadRequestException(`Multipart: ${error.message}`);
  }
  return error;
}
