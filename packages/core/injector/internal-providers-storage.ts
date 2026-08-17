import { AbstractHttpAdapter } from '../adapters/index.js';
import { HttpAdapterHost } from '../helpers/http-adapter-host.js';

export class InternalProvidersStorage {
  private readonly _httpAdapterHost = new HttpAdapterHost();
  private _httpAdapter: AbstractHttpAdapter;

  get httpAdapterHost(): HttpAdapterHost {
    return this._httpAdapterHost;
  }

  get httpAdapter(): AbstractHttpAdapter {
    return this._httpAdapter;
  }

  set httpAdapter(httpAdapter: AbstractHttpAdapter) {
    this._httpAdapter = httpAdapter;
  }
}
