import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';

export class HttpService {
  request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.request<T>(config));
  }

  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.get<T>(url, config));
  }

  delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.delete(url, config));
  }

  head<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.head(url, config));
  }

  post<T = any>(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.post(url, data, config));
  }

  put<T = any>(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.post(url, data, config));
  }

  patch<T = any>(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.post(url, data, config));
  }
}
