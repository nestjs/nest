import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
// @ts-ignore
import { Injectable, Inject } from '@nest/core';
import { defer, Observable } from 'rxjs';

import { AXIOS_INSTANCE_TOKEN } from './tokens';

@Injectable()
export class HttpService {
  @Inject(AXIOS_INSTANCE_TOKEN)
  private readonly instance: AxiosInstance = axios;

  request<T>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.request<T>(config));
  }

  get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.get<T>(url, config));
  }

  delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.delete(url, config));
  }

  head<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.head(url, config));
  }

  post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.post(url, data, config));
  }

  put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return defer(() => this.instance.put(url, data, config));
  }

  patch<T>(
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
