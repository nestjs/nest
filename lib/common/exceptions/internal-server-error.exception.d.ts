import { HttpException } from './http.exception';
export declare class InternalServerErrorException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
