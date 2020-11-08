import { URL } from 'url';
import { Got, GotPaginate, OptionsWithPagination } from 'got';
import { Inject, Injectable } from '../decorators';
import { Observable, asapScheduler, SchedulerLike } from 'rxjs';
import { asyncPromise } from '../addons';
import { GOT_INSTANCE_TOKEN } from './http.constants';

@Injectable()
export class PaginateService {
  constructor(@Inject(GOT_INSTANCE_TOKEN) private readonly got: Got) {}

  each<T = any, R = any>(
    url: string | URL,
    options?: OptionsWithPagination<T, R>,
    scheduler?: SchedulerLike,
  ): Observable<T> {
    return this.makeObservable<T, R>(
      this.got.paginate.each,
      url,
      options,
      scheduler,
    );
  }

  all<T = any, R = any>(
    url: string | URL,
    options?: OptionsWithPagination<T, R>,
    scheduler?: SchedulerLike,
  ): Observable<T[]> {
    return this.makeObservable<T, R>(
      this.got.paginate.all,
      url,
      options,
      scheduler,
    );
  }

  private makeObservable<T, R>(
    paginate: GotPaginate['all'],
    url: string | URL,
    options?: OptionsWithPagination<T, R>,
    scheduler?: SchedulerLike,
  ): Observable<T[]>;
  private makeObservable<T, R>(
    paginate: GotPaginate['each'],
    url: string | URL,
    options?: OptionsWithPagination<T, R>,
    scheduler?: SchedulerLike,
  ): Observable<T>;
  private makeObservable<T, R>(
    paginate: <T, R>(
      url: string | URL,
      options: OptionsWithPagination<T, R>,
    ) => Promise<T[]> | AsyncIterable<T>,
    url: string | URL,
    options?: OptionsWithPagination<T, R>,
    scheduler: SchedulerLike = asapScheduler,
  ): Observable<T | T[]> {
    options = { ...options, isStream: false };

    return asyncPromise<T | T[]>(paginate<T, R>(url, options), scheduler);
  }
}
