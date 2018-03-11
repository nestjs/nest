import { HttpException } from './http.exception';
export declare class GatewayTimeoutException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
