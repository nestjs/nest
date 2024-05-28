import { Global, Module, Scope } from '@nestjs/common';
import { MAIN_DB_CONNECTION } from './main-db-connection.module';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { DatabaseConfiguration } from './database-configuration';

export const ON_PREMISE_DB_CONNECTION = Symbol();

@Global()
@Module({
  providers: [
    {
      provide: ON_PREMISE_DB_CONNECTION,
      scope: Scope.REQUEST,
      inject: [REQUEST, MAIN_DB_CONNECTION],
      useFactory: async (
        request: Request,
        mainDbDatasource: DataSource,
      ): Promise<DataSource> => {
        const clientId: string = request.headers['client-id'];
        const clientDbConfRaw: { db_conf: DatabaseConfiguration }[] =
          await mainDbDatasource.manager.query(
            `select db_conf from client_db_conf where client_id = '${clientId}';`,
          );
        if (clientDbConfRaw.length === 0) {
          throw new Error(`No client db conf found for client_id: ${clientId}`);
        }
        const dbConfiguration: DatabaseConfiguration =
          clientDbConfRaw[0].db_conf;
        const dataSource = new DataSource({
          type: 'postgres',
          host: dbConfiguration.host,
          port: dbConfiguration.port,
          username: dbConfiguration.username,
          password: dbConfiguration.password,
          database: dbConfiguration.database,
        });
        return await dataSource.initialize();
      },
    },
  ],
  exports: [ON_PREMISE_DB_CONNECTION],
})
export class ClientDbConnectionsModule {}
