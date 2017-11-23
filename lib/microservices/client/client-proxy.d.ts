import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
export declare abstract class ClientProxy {
    protected abstract sendSingleMessage(msg: any, callback: (err, result, disposed?: boolean) => void): any;
    send<T>(pattern: any, data: any): Observable<T>;
    protected createObserver<T>(observer: Observer<T>): (err, result, disposed?: boolean) => void;
}
