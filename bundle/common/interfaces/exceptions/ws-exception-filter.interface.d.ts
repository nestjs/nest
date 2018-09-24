import { ArgumentsHost } from '../features/arguments-host.interface';
export interface WsExceptionFilter<T = any> {
    catch(exception: T, host: ArgumentsHost): any;
}
