import { HttpException } from './http.exception';
export declare class ConflictException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
