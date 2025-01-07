import { Observable, Subject } from 'rxjs';
import { AbstractHttpAdapter } from '../adapters/http-adapter';

/**
 * Defines the `HttpAdapterHost` object.
 *
 * `HttpAdapterHost` wraps the underlying
 * platform-specific `HttpAdapter`.  The `HttpAdapter` is a wrapper around the underlying
 * native HTTP server library (e.g., Express).  The `HttpAdapterHost` object
 * provides methods to `get` and `set` the underlying HttpAdapter.
 *
 * @see [Http adapter](https://docs.nestjs.com/faq/http-adapter)
 *
 * @publicApi
 */
export class HttpAdapterHost<
  T extends AbstractHttpAdapter = AbstractHttpAdapter,
> {
  private _httpAdapter?: T;
  private _listen$ = new Subject<void>();
  private isListening = false;

  /**
   * Accessor for the underlying `HttpAdapter`
   *
   * @param httpAdapter reference to the `HttpAdapter` to be set
   */
  set httpAdapter(httpAdapter: T) {
    this._httpAdapter = httpAdapter;
  }

  /**
   * Accessor for the underlying `HttpAdapter`
   *
   * @example
   * `const httpAdapter = adapterHost.httpAdapter;`
   */
  get httpAdapter(): T {
    return this._httpAdapter as T;
  }

  /**
   * Observable that allows to subscribe to the `listen` event.
   * This event is emitted when the HTTP application is listening for incoming requests.
   */
  get listen$(): Observable<void> {
    return this._listen$.asObservable();
  }

  /**
   * Sets the listening state of the application.
   */
  set listening(listening: boolean) {
    this.isListening = listening;

    if (listening) {
      this._listen$.next();
      this._listen$.complete();
    }
  }

  /**
   * Returns a boolean indicating whether the application is listening for incoming requests.
   */
  get listening(): boolean {
    return this.isListening;
  }
}
