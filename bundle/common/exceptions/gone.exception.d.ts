import { HttpException } from './http.exception';
export declare class GoneException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
