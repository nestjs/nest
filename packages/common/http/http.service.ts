import Axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosPromise,
} from 'axios';
import { Observable } from 'rxjs';
import { Inject } from '../decorators';
import { AXIOS_INSTANCE_TOKEN } from './http.constants';

export class HttpService {
  constructor(
    @Inject(AXIOS_INSTANCE_TOKEN)
    private readonly instance: AxiosInstance = Axios,
  ) {}

  request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.request, config);
  }

  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.get, url, config);
  }

  delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.delete, url, config);
  }

  head<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.head, url, config);
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.post, url, data, config);
  }

  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.put, url, data, config);
  }

  patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return this.makeObservable<T>(this.instance.patch, url, data, config);
  }

  get axiosRef(): AxiosInstance {
    return this.instance;
  }

  private makeObservable<T>(
    axios: (...args: any[]) => AxiosPromise<T>,
    ...args: any[]
  ) {
    return new Observable<AxiosResponse<T>>(subscriber => {
      let config = args[args.length - 1];
      if (!config) {
        config = {};
        args[args.length - 1] = config;
      }
      const cancelSource = Axios.CancelToken.source();
      config.cancelToken = cancelSource.token;
      axios(...args)
        .then(res => {
          subscriber.next(res);
          subscriber.complete();
        })
        .catch(err => {
          subscriber.error(err);
        });
      return () => {
        if (config.responseType !== 'stream') {
          cancelSource.cancel();
        }
      };
    });
  }
}
