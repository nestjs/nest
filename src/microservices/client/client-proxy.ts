import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { isNil } from '../../common/utils/shared.utils';
import { InvalidMessageException } from '../exceptions/invalid-message.exception';

export abstract class ClientProxy {

    abstract sendSingleMessage(pattern, callback);

    send<T>(pattern, data): Observable<T> {
        if (isNil(pattern) || isNil(data)) {
            return Observable.throw(new InvalidMessageException());
        }
        return Observable.create((observer: Observer<T>) => {
            this.sendSingleMessage({ pattern, data }, this.createObserver(observer));
        });
    }

    createObserver<T>(observer: Observer<T>) {
        return (err, result) => {
            if (err) {
                (<any>observer).error(err);
                return;
            }
            observer.next(result);
            observer.complete();
        }
    }

}