import { AxiosRequestConfig } from 'axios';
import { DynamicModule } from '../interfaces';
export declare class HttpModule {
    static register(config: AxiosRequestConfig): DynamicModule;
}
