import { URL } from 'url';
import { asyncPromise } from '../addons';
import {
  Got,
  Response,
  GotRequestFunction,
  OptionsOfJSONResponseBody,
} from 'got';
import { asapScheduler, Observable, SchedulerLike } from 'rxjs';
import { StreamService } from './stream.service';
import { Inject, Injectable } from '../decorators';
import { PaginateService } from './paginate.service';
import { GOT_INSTANCE_TOKEN } from './http.constants';

@Injectable()
export class HttpService {
  constructor(
    @Inject(GOT_INSTANCE_TOKEN)
    private readonly instance: Got,
    readonly paginate: PaginateService,
    readonly stream: StreamService,
  ) {}

  get<T = any>(
    url: string | URL,
    config?: OptionsOfJSONResponseBody,
    scheduler?: SchedulerLike,
  ): Observable<Response<T>> {
    return this.makeObservable<T>(this.instance.get, url, config, scheduler);
  }

  delete<T = any>(
    url: string | URL,
    config?: OptionsOfJSONResponseBody,
    scheduler?: SchedulerLike,
  ): Observable<Response<T>> {
    return this.makeObservable<T>(this.instance.delete, url, config, scheduler);
  }

  head<T = any>(
    url: string | URL,
    config?: OptionsOfJSONResponseBody,
    scheduler?: SchedulerLike,
  ): Observable<Response<T>> {
    return this.makeObservable<T>(this.instance.head, url, config, scheduler);
  }

  post<T = any>(
    url: string | URL,
    config?: OptionsOfJSONResponseBody,
    scheduler?: SchedulerLike,
  ): Observable<Response<T>> {
    return this.makeObservable<T>(this.instance.post, url, config, scheduler);
  }

  put<T = any>(
    url: string | URL,
    config?: OptionsOfJSONResponseBody,
    scheduler?: SchedulerLike,
  ): Observable<Response<T>> {
    return this.makeObservable<T>(this.instance.put, url, config, scheduler);
  }

  patch<T = any>(
    url: string | URL,
    config?: OptionsOfJSONResponseBody,
    scheduler?: SchedulerLike,
  ): Observable<Response<T>> {
    return this.makeObservable<T>(this.instance.patch, url, config, scheduler);
  }

  get gotRef(): Got {
    return this.instance;
  }

  private makeObservable<T>(
    got: GotRequestFunction,
    url: string | URL,
    options?: OptionsOfJSONResponseBody,
    scheduler: SchedulerLike = asapScheduler,
  ): Observable<Response<T>> {
    const request = got<T>(url, options);

    return asyncPromise(request, scheduler, request.cancel.bind(request));
  }
}
