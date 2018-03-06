import axios from 'axios';
import { Observable } from 'rxjs/Observable';
import {
  AxiosRequestConfig,
  AxiosResponse,
} from './interfaces/axios.interfaces';
import 'rxjs/add/observable/fromPromise';

export class HttpService {
  public request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.request<T>(config));
  }

  public get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.get<T>(url, config));
  }

  public delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.delete(url, config));
  }

  public head<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.head(url, config));
  }

  public post<T = any>(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.post(url, data, config));
  }

  public put<T = any>(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.post(url, data, config));
  }

  public patch<T = any>(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return Observable.fromPromise(axios.post(url, data, config));
  }
}
