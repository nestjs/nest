import axios, { AxiosRequestConfig } from 'axios';
import { Module } from '../decorators/modules/module.decorator';
import { DynamicModule } from '../interfaces';
import { AXIOS_INSTANCE_TOKEN } from './http.constants';
import { HttpService } from './http.service';

@Module({
  providers: [HttpService, {
    provide: AXIOS_INSTANCE_TOKEN,
    useValue: axios,
  }],
  exports: [HttpService],
})
export class HttpModule {
  static register(config: AxiosRequestConfig): DynamicModule {
    return {
      module: HttpModule,
      providers: [{
        provide: AXIOS_INSTANCE_TOKEN,
        useValue: axios.create(config),
      }],
    };
  }
}
