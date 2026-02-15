import { Module } from '@nestjs/common';
import { databaseProviders } from './database.providers.js';

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
