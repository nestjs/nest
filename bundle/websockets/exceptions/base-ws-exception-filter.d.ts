import { ArgumentsHost, WsExceptionFilter } from '@nestjs/common';
export declare class BaseWsExceptionFilter<T = any> implements WsExceptionFilter<T> {
    catch(exception: T, host: ArgumentsHost): any;
}
