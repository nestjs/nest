import { HttpException } from './http.exception';
export declare class NotImplementedException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
