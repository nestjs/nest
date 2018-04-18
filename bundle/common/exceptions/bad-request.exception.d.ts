import { HttpException } from './http.exception';
export declare class BadRequestException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
