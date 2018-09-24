import { ArgumentsHost } from '../features/arguments-host.interface';
export interface ExceptionFilter<T = any> {
    catch(exception: T, host: ArgumentsHost): any;
}
