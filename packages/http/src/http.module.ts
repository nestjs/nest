import axios, { AxiosRequestConfig } from 'axios';
// @ts-ignore
import { Module, ModuleWithProviders } from '@nest/core';

import { AXIOS_INSTANCE_TOKEN } from './tokens';
import { HttpService } from './http.service';

@Module({
  exports: [HttpService],
  providers: [
    HttpService,
    {
      provide: AXIOS_INSTANCE_TOKEN,
      useValue: axios,
    },
  ],
})
export class HttpModule {
  static register(config: AxiosRequestConfig): ModuleWithProviders {
    return {
      module: HttpModule,
      providers: [
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useValue: axios.create(config),
        },
      ],
    };
  }
}
