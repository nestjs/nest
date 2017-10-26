import { DatabaseModule } from '../database/database.module';
import { CatsController } from './cats.controller';
import { catsProviders } from './cats.providers';
import { CatsService } from './cats.service';
import { Module } from '';

@Module({
  modules: [DatabaseModule],
  controllers: [CatsController],
  components: [
    CatsService,
    ...catsProviders,
  ],
})
export class CatsModule {}
