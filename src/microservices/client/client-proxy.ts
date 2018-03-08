import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { InvalidMessageException } from '../exceptions/invalid-message.exception';
import { _throw } from 'rxjs/observable/throw';

export abstract class ClientProxy {
  protected abstract sendMessage(
    msg: any,
    callback: (err, result, disposed?: boolean) => void,
  );

  public send<T>(pattern, data): Observable<T> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(new InvalidMessageException());
    }
    return new Observable((observer: Observer<T>) => {
      this.sendMessage({ pattern, data }, this.createObserver(observer));
    });
  }

  protected createObserver<T>(
    observer: Observer<T>,
  ): (err, result, disposed?: boolean) => void {
    return (err, result, disposed) => {
      if (err) {
        return observer.error(err);
      } else if (disposed) {
        return observer.complete();
      }
      observer.next(result);
    };
  }
}
