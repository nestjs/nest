import axios from 'axios';
import { Observable } from 'rxjs/Observable';
import {
  AxiosRequestConfig,
  AxiosResponse,
} from './interfaces/axios.interfaces';
import { fromPromise } from 'rxjs/observable/fromPromise';

export class HttpService {
  request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>> {
    return fromPromise(axios.request<T>(config));
  }
  
  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return fromPromise(axios.get<T>(url, config));
  }

  delete(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>> {
    return fromPromise(axios.delete(url, config));
  }

  head(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>> {
    return fromPromise(axios.head(url, config));
  }

  post(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>> {
    return fromPromise(axios.post(url, data, config));
  }

  put(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>> {
    return fromPromise(axios.post(url, data, config));
  }

  patch(
    url: string,
    data?,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>> {
    return fromPromise(axios.post(url, data, config));
  }
}
