import { HttpException } from './http.exception';
export declare class PayloadTooLargeException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
