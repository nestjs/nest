import { URL } from 'url';
import { Readable } from 'stream';
import { Inject, Injectable } from '../decorators';
import { Got, HTTPAlias, StreamOptions } from 'got';
import { GOT_INSTANCE_TOKEN } from './http.constants';
import { StreamRequest } from './stream.request';

@Injectable()
export class StreamService {
  constructor(
    @Inject(GOT_INSTANCE_TOKEN) private readonly got: Got,
    private readonly request: StreamRequest,
  ) {}

  get(url: string | URL, options?: StreamOptions): StreamRequest {
    return this.makeRequest('get', url, undefined, options);
  }

  head(url: string | URL, options?: StreamOptions): StreamRequest {
    return this.makeRequest('head', url, undefined, options);
  }

  delete(
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest {
    return this.makeRequest('delete', url, filePathOrStream, options);
  }

  post(
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest {
    return this.makeRequest('post', url, filePathOrStream, options);
  }

  patch(
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest {
    return this.makeRequest('patch', url, filePathOrStream, options);
  }

  put(
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest {
    return this.makeRequest('put', url, filePathOrStream, options);
  }

  private makeRequest(
    verb: Extract<HTTPAlias, 'get' | 'head'>,
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest;
  private makeRequest(
    verb: Extract<HTTPAlias, 'post' | 'put' | 'patch' | 'delete'>,
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest;
  private makeRequest(
    verb: HTTPAlias,
    url: string | URL,
    filePathOrStream?: string | Readable,
    options?: StreamOptions,
  ): StreamRequest {
    return this.request.process(this.got, verb, url, filePathOrStream, options);
  }
}
