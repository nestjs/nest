import { HttpException } from './http.exception';
export declare class NotAcceptableException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
