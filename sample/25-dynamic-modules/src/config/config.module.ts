import { DynamicModule, Module } from '@nestjs/common';
import { ConfigOptions } from './interfaces';
import { ConfigService } from './config.service';
import { CONFIG_OPTIONS } from './constants';

@Module({})
export class ConfigModule {
  static register(options: ConfigOptions): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        ConfigService,
      ],
      exports: [ConfigService],
    };
  }
}
