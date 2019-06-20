import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction, isString } from '@nestjs/common/utils/shared.utils';
import {
  ConnectableObservable,
  EMPTY as empty,
  from as fromPromise,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { catchError, finalize, publish } from 'rxjs/operators';
import {
  MessageHandler,
  MicroserviceOptions,
  ReadPacket,
  WritePacket,
} from '../interfaces';
import { NO_EVENT_HANDLER } from './../constants';

import * as Utils from '../utils';

export abstract class Server {
  protected readonly messageHandlers = new Map<string, MessageHandler>();
  protected readonly logger = new Logger(Server.name);
  protected readonly msvcUtil = Utils.MsvcUtil;

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
  ) {
    const key = isString(pattern) ? pattern : JSON.stringify(pattern);
    const route = this.getRouteFromPattern(key);
    callback.isEventHandler = isEventHandler;
    this.messageHandlers.set(route, callback);
  }

  public getHandlers(): Map<string, MessageHandler> {
    return this.messageHandlers;
  }

  public getHandlerByPattern(pattern: string): MessageHandler | null {
    const route = this.getRouteFromPattern(pattern);
    return this.messageHandlers.has(route)
      ? this.messageHandlers.get(route)
      : null;
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

  public async handleEvent(pattern: string, packet: ReadPacket): Promise<any> {
    const handler = this.getHandlerByPattern(pattern);
    if (!handler) {
      return this.logger.error(NO_EVENT_HANDLER);
    }
    const resultOrStream = await handler(packet.data);
    if (this.isObservable(resultOrStream)) {
      (resultOrStream.pipe(publish()) as ConnectableObservable<any>).connect();
    }
  }

  public transformToObservable<T = any>(resultOrDeffered: any): Observable<T> {
    if (resultOrDeffered instanceof Promise) {
      return fromPromise(resultOrDeffered);
    } else if (!this.isObservable(resultOrDeffered)) {
      return of(resultOrDeffered);
    }
    return resultOrDeffered;
  }

  public getOptionsProp<
    T extends MicroserviceOptions['options'],
    K extends keyof T
  >(obj: T, prop: K, defaultValue: T[K] = undefined) {
    return (obj && obj[prop]) || defaultValue;
  }

  protected handleError(error: string) {
    this.logger.error(error);
  }

  protected loadPackage<T = any>(
    name: string,
    ctx: string,
    loader?: Function,
  ): T {
    return loadPackage(name, ctx, loader);
  }

  private isObservable(input: unknown): input is Observable<any> {
    return input && isFunction((input as Observable<any>).subscribe);
  }

  /**
   * Transforms the server Pattern to valid type and returns a route for him.
   *
   * @param  {string} pattern - server pattern
   * @returns string
   */
  private getRouteFromPattern(pattern: string): string {
    let validPattern: any;

    try {
      // Gets the pattern in JSON format
      validPattern = JSON.parse(pattern);
    } catch (error) {
      // Uses a fundamental object (`pattern` variable without any conversion)
      validPattern = pattern;
    }

    // Transform the Pattern to Route
    return this.msvcUtil.transformPatternToRoute(validPattern);
  }
}
