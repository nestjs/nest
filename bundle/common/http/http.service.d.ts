import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
export declare class HttpService {
    private readonly instance;
    constructor(instance?: AxiosInstance);
    request<T = any>(config: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    head<T = any>(url: string, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Observable<AxiosResponse<T>>;
    readonly axiosRef: AxiosInstance;
}
