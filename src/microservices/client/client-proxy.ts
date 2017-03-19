import { Observable } from 'rxjs';
import { Observer } from 'rxjs/Observer';

export abstract class ClientProxy {

    abstract sendSingleMessage(pattern, callback);

    send<T>(pattern, data): Observable<T> {
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