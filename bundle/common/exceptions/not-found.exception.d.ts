import { HttpException } from './http.exception';
export declare class NotFoundException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
