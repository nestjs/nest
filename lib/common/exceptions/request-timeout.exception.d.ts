import { HttpException } from './http.exception';
export declare class RequestTimeoutException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
