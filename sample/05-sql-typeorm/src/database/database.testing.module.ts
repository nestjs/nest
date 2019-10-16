import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseTestingOrmModule } from './database.config';

@Global()
@Module({
  imports: [DatabaseTestingOrmModule()],
  exports: [TypeOrmModule],
})
export class DatabaseTestingModule {}
