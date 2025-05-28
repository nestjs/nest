import { DynamicModule, Module } from '@nestjs/common';
import { DatabaseConnection } from './database.connection';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const connectionProvider = {
      provide: DatabaseConnection,
      useFactory: () => {
        return DatabaseConnection.connect();
      },
    };
    return {
      global: true,
      module: DatabaseModule,
      providers: [connectionProvider],
      exports: [connectionProvider],
    };
  }
}
