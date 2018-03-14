import { BadRequestException } from './../../exceptions';
export declare function transformException(error: Error | undefined): Error | BadRequestException;
