import { isNil } from '@nestjs/common/utils/shared.utils';
import { defer, fromEvent, merge, Observable, Observer, throwError as _throw } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { CONNECT_EVENT, ERROR_EVENT } from '../constants';
import { InvalidMessageException } from '../exceptions/errors/invalid-message.exception';
import { ClientOptions, PacketId, ReadPacket, WritePacket } from '../interfaces';

export abstract class ClientProxy {
  public abstract connect(): Promise<any>;
  public abstract close(): any;

  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(new InvalidMessageException());
    }
    return defer(async () => await this.connect()).pipe(
      mergeMap(
        () =>
          new Observable((observer: Observer<TResult>) => {
            const callback = this.createObserver(observer);
            return this.publish({ pattern, data }, callback);
          }),
      ),
    );
  }

  protected abstract publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  ): Function | void;

  protected createObserver<T>(
    observer: Observer<T>,
  ): (packet: WritePacket) => void {
    return ({ err, response, isDisposed }: WritePacket) => {
      if (err) {
        return observer.error(err);
      } else if (isDisposed) {
        return observer.complete();
      }
      observer.next(response);
    };
  }

  protected assignPacketId(packet: ReadPacket): ReadPacket & PacketId {
    const id =
      Math.random()
        .toString(36)
        .substr(2, 5) + Date.now();
    return Object.assign(packet, { id });
  }

  protected connect$(
    instance: any,
    errorEvent = ERROR_EVENT,
    connectEvent = CONNECT_EVENT,
  ): Observable<any> {
    const error$ = fromEvent(instance, errorEvent).pipe(
      map(err => {
        throw err;
      }),
    );
    const connect$ = fromEvent(instance, connectEvent);
    return merge(error$, connect$).pipe(take(1));
  }

  protected getOptionsProp<T extends { options? }>(
    obj: ClientOptions,
    prop: keyof T['options'],
    defaultValue = undefined,
  ) {
    return obj && obj.options ? obj.options[prop as any] : defaultValue;
  }
}
