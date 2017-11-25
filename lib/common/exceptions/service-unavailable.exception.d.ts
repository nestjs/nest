import { HttpException } from './http.exception';
export declare class ServiceUnavailableException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
