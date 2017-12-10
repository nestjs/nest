import { InvalidMessageException } from '../exceptions/invalid-message.exception';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { isNil } from '@nestjs/common/utils/shared.utils';

export abstract class ClientProxy {
    protected abstract sendSingleMessage(msg: any, callback: (err: any, result: any, disposed?: boolean) => void): any;

    public send<T>(pattern: any, data: any): Observable<T> {
        if (isNil(pattern) || isNil(data)) {
            return Observable.throw(new InvalidMessageException());
        }
        return Observable.create((observer: Observer<T>) => {
            this.sendSingleMessage(
                { pattern, data },
                this.createObserver(observer),
            );
        });
    }

    protected createObserver<T>(observer: Observer<T>): (err: any, result: any, disposed?: boolean) => void {
        return (err, result, disposed) => {
            if (err) {
                observer.error(err);
                return;
            }
            else if (disposed) {
                observer.complete();
                return;
            }
            observer.next(result);
        };
    }

}
