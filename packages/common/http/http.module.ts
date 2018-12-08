import Axios, { AxiosRequestConfig } from 'axios';
import { Module } from '../decorators/modules/module.decorator';
import { DynamicModule } from '../interfaces';
import { randomStringGenerator } from '../utils/random-string-generator.util';
import { AXIOS_INSTANCE_TOKEN, HTTP_MODULE_ID } from './http.constants';
import { HttpService } from './http.service';

@Module({
  providers: [
    HttpService,
    {
      provide: AXIOS_INSTANCE_TOKEN,
      useValue: Axios,
    },
  ],
  exports: [HttpService],
})
export class HttpModule {
  static register(config: AxiosRequestConfig): DynamicModule {
    return {
      module: HttpModule,
      providers: [
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useValue: Axios.create(config),
        },
        {
          provide: HTTP_MODULE_ID,
          useValue: randomStringGenerator(),
        },
      ],
    };
  }
}
