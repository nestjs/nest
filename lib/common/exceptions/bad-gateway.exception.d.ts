import { HttpException } from './http.exception';
export declare class BadGatewayException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
