import { HttpException } from './http.exception';
export declare class UnsupportedMediaTypeException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
