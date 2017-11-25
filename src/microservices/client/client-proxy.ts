import {isNil} from '@nestjs/common/utils/shared.utils';
import {Observable} from 'rxjs/Observable';
import {Observer} from 'rxjs/Observer';

import {InvalidMessageException} from '../exceptions/invalid-message.exception';

export abstract class ClientProxy {
  protected abstract sendSingleMessage(msg,
                                       callback: (err, result,
                                                  disposed?: boolean) => void);

  public send<T>(pattern, data): Observable<T> {
    if (isNil(pattern) || isNil(data)) {
      return Observable.throw(new InvalidMessageException());
    }
    return Observable.create((observer: Observer<T>) => {
      this.sendSingleMessage(
          {pattern, data},
          this.createObserver(observer),
      );
    });
  }

  protected createObserver<T>(observer: Observer<T>):
      (err, result, disposed?: boolean) => void {
    return (err, result, disposed) => {
      if (err) {
        observer.error(err);
        return;
      } else if (disposed) {
        observer.complete();
        return;
      }
      observer.next(result);
    };
  }
}