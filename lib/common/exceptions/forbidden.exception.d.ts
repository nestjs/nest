import { HttpException } from './http.exception';
export declare class ForbiddenException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
