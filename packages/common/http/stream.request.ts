import { URL } from 'url';
import { resolve } from 'path';
import { Readable } from 'stream';
import { createReadStream } from 'fs';
import { Scope } from '../interfaces';
import Request from 'got/dist/source/core';
import { fromEvent, Observable } from 'rxjs';
import { Injectable } from '../decorators';
import { Got, HTTPAlias, StreamOptions, GotStream } from 'got';
import { EventListenerOptions } from 'rxjs/internal/observable/fromEvent';

@Injectable({ scope: Scope.TRANSIENT })
export class StreamRequest {
  private stream!: Request;

  process(
    got: Got,
    method: HTTPAlias,
    url: string | URL,
    file?: string | Readable,
    streamOptions: StreamOptions = {},
  ): this {
    this.createRequest(got, method, url, {
      ...streamOptions,
      isStream: true,
    }).writeToRequest(method, file);

    return this;
  }

  on<T = unknown>(
    eventName:
      | 'end'
      | 'data'
      | 'error'
      | 'request'
      | 'readable'
      | 'response'
      | 'redirect'
      | 'uploadProgress'
      | 'downloadProgress',
    eventListenerOptions: EventListenerOptions = {},
  ): Observable<T> {
    return fromEvent<T>(this.stream, eventName, eventListenerOptions);
  }

  private createRequest(
    got: Got,
    method: string,
    url: string | URL,
    streamOptions?: StreamOptions,
  ): this {
    this.stream = (got.stream[method] as GotStream)(url, streamOptions);

    return this;
  }

  private writeToRequest(method: HTTPAlias, file?: string | Readable): this {
    if (typeof file === 'string') {
      file = createReadStream(resolve(process.cwd(), file));
      file.on('end', file.destroy.bind(file));
    }

    if (file instanceof Readable) {
      file.on('data', this.stream.write.bind(this.stream));
      file.on('end', this.stream.end.bind(this.stream));
    } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
      this.stream.end();
    }

    return this;
  }
}
