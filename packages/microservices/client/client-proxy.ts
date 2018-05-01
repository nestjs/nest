import { Observable, Observer, throwError as _throw } from 'rxjs';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { InvalidMessageException } from '../exceptions/invalid-message.exception';
import {
  ReadPacket,
  PacketId,
  WritePacket,
  ClientOptions,
} from './../interfaces';

export abstract class ClientProxy {
  public abstract close(): any;
  protected abstract publish(
    packet: ReadPacket,
    callback: (packet: WritePacket) => void,
  );

  public send<T = any>(pattern: any, data: any): Observable<T> {
    if (isNil(pattern) || isNil(data)) {
      return _throw(new InvalidMessageException());
    }
    return new Observable((observer: Observer<T>) => {
      this.publish({ pattern, data }, this.createObserver(observer));
    });
  }

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

  protected getOptionsProp<T extends { options? }>(
    obj: ClientOptions,
    prop: keyof T['options'],
    defaultValue = undefined,
  ) {
    return obj && obj.options ? obj.options[prop as any] : defaultValue;
  }
}