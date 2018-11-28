import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction, isString } from '@nestjs/common/utils/shared.utils';
import {
  EMPTY as empty,
  from as fromPromise,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { MicroserviceOptions, WritePacket } from '../interfaces';
import { MessageHandlers } from '../interfaces/message-handlers.interface';

export abstract class Server {
  protected readonly messageHandlers: MessageHandlers = {};
  protected readonly logger = new Logger(Server.name);

  public addHandler(
    pattern: any,
    callback: <T>(data: T) => Promise<Observable<any>>,
  ) {
    const key = isString(pattern) ? pattern : JSON.stringify(pattern);
    this.messageHandlers[key] = callback;
  }

  public getHandlers(): MessageHandlers {
    return this.messageHandlers;
  }

  public getHandlerByPattern(
    pattern: string,
  ): <T>(data: T) => Promise<Observable<any>> | null {
    return this.messageHandlers[pattern] ? this.messageHandlers[pattern] : null;
  }

  public send(
    stream$: Observable<any>,
    respond: (data: WritePacket) => void,
  ): Subscription {
    return stream$
      .pipe(
        catchError((err: any) => {
          respond({ err, response: null });
          return empty;
        }),
        finalize(() => respond({ isDisposed: true })),
      )
      .subscribe((response: any) => respond({ err: null, response }));
  }

  public transformToObservable<T = any>(resultOrDeffered: any): Observable<T> {
    if (resultOrDeffered instanceof Promise) {
      return fromPromise(resultOrDeffered);
    } else if (!(resultOrDeffered && isFunction(resultOrDeffered.subscribe))) {
      return of(resultOrDeffered);
    }
    return resultOrDeffered;
  }

  public getOptionsProp<T extends { options?: any }>(
    obj: MicroserviceOptions['options'],
    prop: keyof T['options'],
    defaultValue: any = undefined,
  ) {
    return obj ? obj[prop as string] : defaultValue;
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }

  protected loadPackage(name: string, ctx: string) {
    return loadPackage(name, ctx);
  }
}
