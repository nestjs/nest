import { AbstractHttpAdapter } from '../adapters/http-adapter';

export class HttpAdapterHost<T extends AbstractHttpAdapter = any> {
  private _httpAdapter: T;

  set httpAdapter(httpAdapter: T) {
    this._httpAdapter = httpAdapter;
  }

  get httpAdapter(): T | undefined {
    return this._httpAdapter;
  }
}
