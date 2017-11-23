import { HttpException } from './http.exception';
export declare class UnprocessableEntityException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
