import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable } from 'rxjs/Observable';
<<<<<<< HEAD
import { AxiosRequestConfig, AxiosResponse } from './interfaces/axios.interfaces';
=======
import 'rxjs/add/observable/fromPromise';
>>>>>>> master
export declare class HttpService {
    request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    head<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
}
