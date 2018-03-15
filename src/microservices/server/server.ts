import { Logger } from '@nestjs/common/services/logger.service';
import { MessageHandlers } from '../interfaces/message-handlers.interface';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { catchError } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { empty } from 'rxjs/observable/empty';
import { of } from 'rxjs/observable/of';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { WritePacket } from './../interfaces';

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

  public add(pattern, callback: (data) => Promise<Observable<any>>) {
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
          return empty();
        }),
        finalize(() => respond({ isDisposed: true })),
      )
      .subscribe(response => respond({ err: null, response }));
  }

  public transformToObservable(resultOrDeffered) {
    if (resultOrDeffered instanceof Promise) {
      return fromPromise(resultOrDeffered);
    } else if (!(resultOrDeffered && isFunction(resultOrDeffered.subscribe))) {
      return of(resultOrDeffered);
    }
    return resultOrDeffered;
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }
}
