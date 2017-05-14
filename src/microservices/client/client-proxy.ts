import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { InvalidMessageException } from '../exceptions/invalid-message.exception';

export abstract class ClientProxy {
    public abstract sendSingleMessage(pattern, callback);

    public send<T>(pattern, data): Observable<T> {
        if (isNil(pattern) || isNil(data)) {
            return Observable.throw(new InvalidMessageException());
        }
        return Observable.create((observer: Observer<T>) => {
            this.sendSingleMessage({ pattern, data }, this.createObserver(observer));
        });
    }

    public createObserver<T>(observer: Observer<T>) {
        return (err, result) => {
            if (err) {
                (observer as any).error(err);
                return;
            }
            observer.next(result);
            observer.complete();
        };
    }

}