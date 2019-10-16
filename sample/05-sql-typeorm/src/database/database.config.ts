import { DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

export function DatabaseOrmModule(): DynamicModule {
  return TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'root',
    database: 'test',
    entities: [join(__dirname, '../**/**.entity{.ts,.js}')],
    synchronize: true,
  });
}

export function DatabaseTestingOrmModule(): DynamicModule {
  return TypeOrmModule.forRoot({
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'root',
    database: 'testdb',
    entities: [join(__dirname, '../**/**.entity{.ts,.js}')],
    synchronize: true,
  });
}
