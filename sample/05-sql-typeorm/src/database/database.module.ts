import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseOrmModule } from './database.config';

@Global()
@Module({
  imports: [DatabaseOrmModule()],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
