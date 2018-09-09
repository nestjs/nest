import { HttpException } from './http.exception';
/**
 * Any attempt to brew coffee with a teapot should result in the error code "418 I'm a teapot".
 * The resulting entity body MAY be short and stout.
 *
 * http://save418.com/
 */
export declare class ImATeapotException extends HttpException {
    constructor(message?: string | object | any, error?: string);
}
