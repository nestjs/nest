import { HttpException } from './http.exception';
export declare class UnauthorizedException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
