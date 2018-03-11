import { Observable } from 'rxjs/Observable';
import {
  AxiosRequestConfig,
  AxiosResponse,
} from './interfaces/axios.interfaces';
import 'rxjs/add/observable/fromPromise';
export declare class HttpService {
  request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>>;
  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>>;
  delete(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>>;
  head(
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>>;
  post(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>>;
  put(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>>;
  patch(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<any>>;
}
