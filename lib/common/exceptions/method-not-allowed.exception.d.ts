import { HttpException } from './http.exception';
export declare class MethodNotAllowedException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
