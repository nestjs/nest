import { Logger } from '@nestjs/common/services/logger.service';
import { MessageHandlers } from '../interfaces/message-handlers.interface';
import {
  Observable,
  Subscription,
  EMPTY as empty,
  of,
  from as fromPromise,
} from 'rxjs';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { catchError, finalize } from 'rxjs/operators';
import { WritePacket, MicroserviceOptions } from './../interfaces';
import { loadPackage } from '@nestjs/common/utils/load-package.util';

export abstract class Server {
  protected readonly messageHandlers: MessageHandlers = {};
  protected readonly logger = new Logger(Server.name);

  public getHandlers(): MessageHandlers {
    return this.messageHandlers;
  }

  public getHandlerByPattern(
    pattern: string,
  ): (data) => Promise<Observable<any>> | null {
    return this.messageHandlers[pattern] ? this.messageHandlers[pattern] : null;
  }

  public addHandler(
    pattern: any,
    callback: (data) => Promise<Observable<any>>,
  ) {
    this.messageHandlers[JSON.stringify(pattern)] = callback;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => void,
  ): Subscription {
    return stream$
      .pipe(
        catchError(err => {
          respond({ err, response: null });
          return empty;
        }),
        finalize(() => respond({ isDisposed: true })),
      )
      .subscribe(response => respond({ err: null, response }));
  }

  public transformToObservable<T = any>(resultOrDeffered): Observable<T> {
    if (resultOrDeffered instanceof Promise) {
      return fromPromise(resultOrDeffered);
    } else if (!(resultOrDeffered && isFunction(resultOrDeffered.subscribe))) {
      return of(resultOrDeffered);
    }
    return resultOrDeffered;
  }

  public getOptionsProp<T extends { options? }>(
    obj: MicroserviceOptions,
    prop: keyof T['options'],
    defaultValue = undefined,
  ) {
    return obj && obj.options ? obj.options[prop as any] : defaultValue;
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }

  protected loadPackage(name: string, ctx: string) {
    return loadPackage(name, ctx);
  }
}
