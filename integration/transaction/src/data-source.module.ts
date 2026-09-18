import { Module } from '@nestjs/common';
import {
  DATA_SOURCE,
  DataSourceShutdown,
  dataSourceProvider,
} from './data-source.provider.js';

@Module({
  providers: [dataSourceProvider, DataSourceShutdown],
  exports: [DATA_SOURCE],
})
export class DataSourceModule {}
