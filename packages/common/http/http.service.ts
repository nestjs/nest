import Axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { defer, Observable } from 'rxjs';
import { Inject } from '../decorators';
import { AXIOS_INSTANCE_TOKEN } from './http.constants';

export class HttpService {
  constructor(
    @Inject(AXIOS_INSTANCE_TOKEN)
    private readonly instance: AxiosInstance = Axios,
  ) {}

  request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.request<T>(config));
  }

  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.get<T>(url, config));
  }

  delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.delete(url, config));
  }

  head<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.head(url, config));
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.post(url, data, config));
  }

  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.put(url, data, config));
  }

  patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.patch(url, data, config));
  }

  get axiosRef(): AxiosInstance {
    return this.instance;
  }
}
