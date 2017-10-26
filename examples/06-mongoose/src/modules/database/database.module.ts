import { databaseProviders } from './database.providers';
import { Module } from '';

@Module({
  components: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
