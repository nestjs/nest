import Axios from 'axios';
import { Module } from '../decorators/modules/module.decorator';
import { DynamicModule } from '../interfaces';
import { AXIOS_INSTANCE_TOKEN } from './http.constants';
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  initialize,
  MODULE_OPTIONS_TOKEN,
} from './http.module-definition';
import { HttpService } from './http.service';
import { HttpModuleOptions } from './interfaces';

/**
 * @deprecated "HttpModule" (from the "@nestjs/common" package) is deprecated and will be removed in the next major release. Please, use the "@nestjs/axios" package instead.
 */
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
export class HttpModule extends ConfigurableModuleClass {
  static module = initialize(HttpModule);

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    return {
      ...super.registerAsync(options),
      providers: [
        {
          provide: AXIOS_INSTANCE_TOKEN,
          useFactory: (config: HttpModuleOptions) => Axios.create(config),
          inject: [MODULE_OPTIONS_TOKEN],
        },
      ],
    };
  }
}
