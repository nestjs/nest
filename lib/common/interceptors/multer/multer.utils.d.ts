import {
  PayloadTooLargeException,
  BadRequestException,
} from './../../exceptions';
export declare function transformException(
  error: Error | undefined,
): Error | BadRequestException | PayloadTooLargeException;
