import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseConfiguration } from './database-configuration';

export const MAIN_DB_CONNECTION = Symbol();

const mainDbConf: DatabaseConfiguration = {
  host: 'localhost',
  port: 34301,
  password: 'adminpostgres',
  username: 'adminpostgres',
  database: 'maindb',
};

@Global()
@Module({
  providers: [
    {
      provide: MAIN_DB_CONNECTION,
      useFactory: async (): Promise<DataSource> => {
        const dataSource = new DataSource({
          type: 'postgres',
          ...mainDbConf,
        });
        return await dataSource.initialize();
      },
    },
  ],
  exports: [MAIN_DB_CONNECTION],
})
export class MainDbConnectionModule {}
