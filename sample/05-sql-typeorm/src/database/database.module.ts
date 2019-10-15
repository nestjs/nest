import { Module, Global, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

function DatabaseOrmModule(): DynamicModule {
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

@Global()
@Module({
  imports: [DatabaseOrmModule()],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
