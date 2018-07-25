/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { RequestMethod } from '../../enums';
export declare type ErrorHandler = (error: any, req: Partial<IncomingMessage>, res: ServerResponse | any, next?: Function) => any;
export declare type RequestHandler = (req: Partial<IncomingMessage>, res: ServerResponse | any, next?: Function) => any;
export interface HttpServer {
    use(handler: RequestHandler | ErrorHandler): any;
    use(path: any, handler: RequestHandler | ErrorHandler): any;
    get(handler: RequestHandler): any;
    get(path: any, handler: RequestHandler): any;
    post(handler: RequestHandler): any;
    post(path: any, handler: RequestHandler): any;
    head(handler: RequestHandler): any;
    head(path: any, handler: RequestHandler): any;
    delete(handler: RequestHandler): any;
    delete(path: any, handler: RequestHandler): any;
    put(handler: RequestHandler): any;
    put(path: any, handler: RequestHandler): any;
    patch(handler: RequestHandler): any;
    patch(path: any, handler: RequestHandler): any;
    options(handler: RequestHandler): any;
    options(path: any, handler: RequestHandler): any;
    listen(port: number | string, callback?: () => void): any;
    listen(port: number | string, hostname: string, callback?: () => void): any;
    reply(response: any, body: any, statusCode: number): any;
    render(response: any, view: string, options: any): any;
    setHeader(response: any, name: string, value: string): any;
    setErrorHandler?(handler: Function): any;
    setNotFoundHandler?(handler: Function): any;
    useStaticAssets?(...args: any[]): this;
    setBaseViewsDir?(path: string): this;
    setViewEngine?(engineOrOptions: any): this;
    createMiddlewareFactory(method: RequestMethod): (path: string, callback: Function) => any;
    getRequestMethod?(request: any): string;
    getRequestUrl?(request: any): string;
    getInstance(): any;
    getHttpServer(): any;
    close(): any;
}
