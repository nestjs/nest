import { Observable } from 'rxjs';

import { MissingRequiredDependencyException } from './errors';
import { InjectionToken, NestModule } from './module';
import { Type } from './interfaces';

export interface DeferredPromise<T> extends Promise<T> {
  resolve: () => void;
  reject: () => void;
}

export class Utils {
  public static isNode() {
    return (
      !this.isNil(process) &&
      this.isObject((<any>process).release) &&
      (<any>process).release.name === 'node'
    );
  }

  public static processExit(code: number = 0) {
    if (this.isNode()) {
      process.exit(code);
    }
  }

  public static isElectron() {
    // Renderer process
    if (
      !this.isNil(window) &&
      this.isObject((<any>window).process) &&
      (<any>window).process.type === 'renderer'
    )
      return true;

    // Main process
    if (
      !this.isNil(process) &&
      this.isObject(process.versions) &&
      !this.isNil((<any>process.versions).electron)
    )
      return true;

    // Detect the user agent when the `nodeIntegration` option is set to true
    return (
      this.isObject(navigator) &&
      this.isString(navigator.userAgent) &&
      (<any>navigator.userAgent).includes('Electron')
    );
  }

  public static async loadPackage<T>(
    name: string,
    context: string,
  ): Promise<T> {
    try {
      return await require(name);
    } catch (e) {
      throw new MissingRequiredDependencyException(name, context);
    }
  }

  public static async getDeferred<T>(value: any): Promise<T> {
    return this.isPromise(value) ? await value : value;
  }

  public static isIterable(val: any): val is Iterable<any> {
    return val && this.isFunction(val[Symbol.iterator]);
  }

  public static isPromise(val: any): val is Promise<any> {
    return val && this.isFunction(val.then);
  }

  public static isObservable(val: any): val is Observable<any> {
    return val && this.isFunction(val.subscribe);
  }

  public static isSymbol(val: any): val is symbol {
    return typeof val === 'symbol';
  }

  public static isNamedFunction(
    val: any,
  ): val is Type<any> | InjectionToken<any> | Function {
    return (
      val &&
      !this.isNil(val.name) &&
      (this.isFunction(val) || this.isFunction(val.constructor))
    );
  }

  public static isFunction(val: any): val is Function {
    return typeof val === 'function';
  }

  public static isNumber(val: any): val is number {
    return typeof val === 'number';
  }

  public static isBoolean(val: any): val is boolean {
    return typeof val === 'boolean';
  }

  public static isString(val: any): val is string {
    return typeof val === 'string';
  }

  public static isNil(val: any): val is undefined | null {
    return this.isUndefined(val) || val === null;
  }

  public static isObject(val: any): val is Object {
    return typeof val === 'object';
  }

  public static isUndefined(val: any): val is undefined {
    return typeof val === 'undefined';
  }

  public static promisify<F extends Function>(fn: F) {
    return <T>(...args: any[]): Promise<T> => {
      if (!this.isFunction(fn))
        throw new Error(
          `Can't promisify a non function: ${JSON.stringify(fn)}`,
        );

      return new Promise((resolve, reject) => {
        fn(...args, (err: Error, ...rest: any[]) => {
          if (err) return reject(err);
          resolve(...rest);
        });
      });
    };
  }

  public static getValues<T, S = string>(
    entries: IterableIterator<[S, T]> | Array<[S, T]>,
  ): T[] {
    // const iterable = this.isIterable(entries);

    return (<Array<[S, T]>>[...entries]).map<T>(([_, value]) => value);
  }

  public static concat<T = Type<NestModule>>(...props: any[]): T[] {
    return [].concat(...props);
  }

  public static flatten<T>(arr: any[][]): T[] {
    return arr.reduce((previous, current) => [...previous, ...current], []);
  }

  public static omit<T extends { [name: string]: any }>(
    from: T,
    ...by: any[]
  ): T {
    for (const key of by) {
      delete from[key];
    }

    return from;
  }

  public static async series<T>(promises: Promise<T>[]) {
    for (const promise of promises) {
      await promise;
    }
  }

  public static filterWhen<T>(
    arr: any[],
    statement: any,
    filter: (value: T, index: number, array: T[]) => boolean,
  ) {
    return !!statement ? arr.filter(filter) : arr;
  }

  public static pick<T>(from: any[], by: any[]): T[] {
    return from.filter(f => by.includes(f));
  }

  public static createDeferredPromise<T>(): DeferredPromise<T> {
    let resolve!: () => void;
    let reject!: () => void;

    const deferred: any = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    deferred.resolve = resolve;
    deferred.reject = reject;

    return deferred;
  }

  public static async transformResult<T>(
    resultOrDeferred: T | Promise<T> | Observable<T>,
  ): Promise<T> {
    if (this.isObservable(resultOrDeferred)) {
      return await (<Observable<T>>resultOrDeferred).toPromise();
    }

    return await resultOrDeferred;
  }
}
