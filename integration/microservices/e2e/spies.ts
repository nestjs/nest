import {
  ArgumentMetadata,
  ArgumentsHost,
  CallHandler,
  CanActivate,
  ExceptionFilter,
  ExecutionContext,
  NestInterceptor,
  PipeTransform,
} from '@nestjs/common';
import { EMPTY, Observable } from 'rxjs';

export class SpyGuard implements CanActivate {
  private _called = false;
  private _context: ExecutionContext;

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    this._called = true;
    this._context = context;

    return true;
  }

  get called(): boolean {
    return this._called;
  }

  get context(): ExecutionContext {
    return this._context;
  }
}

export class SpyFilter<T = unknown> implements ExceptionFilter<T> {
  private _called = false;
  private _exception: T;
  private _host: ArgumentsHost;

  catch(exception: T, host: ArgumentsHost): Observable<any> {
    this._called = true;
    this._exception = exception;
    this._host = host;

    return EMPTY;
  }

  get called(): boolean {
    return this._called;
  }

  get host(): ArgumentsHost {
    return this._host;
  }

  get exception(): T {
    return this._exception;
  }
}

export class SpyInterceptor<T = unknown> implements NestInterceptor<T, T> {
  private _called = false;
  private _context: ExecutionContext;
  private _next: CallHandler;

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<T> | Promise<Observable<T>> {
    this._called = true;
    this._context = context;
    this._next = next;

    return next.handle();
  }

  get called(): boolean {
    return this._called;
  }

  get context(): ExecutionContext {
    return this._context;
  }

  get next(): CallHandler {
    return this._next;
  }
}

export class SpyPipe<T = unknown> implements PipeTransform<T, T> {
  private _called = false;
  private _value: T;
  private _metadata: ArgumentMetadata;

  transform(value: T, metadata: ArgumentMetadata): T {
    this._called = true;
    this._value = value;
    this._metadata = metadata;

    return value;
  }

  get called(): boolean {
    return this._called;
  }

  get value(): T {
    return this._value;
  }

  get metadata(): ArgumentMetadata {
    return this._metadata;
  }
}
