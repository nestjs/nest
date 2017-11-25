import {Module} from '@nestjs/common';

import {DatabaseModule} from '../database/database.module';

import {CatsController} from './cats.controller';
import {catsProviders} from './cats.providers';
import {CatsService} from './cats.service';

@Module({
  modules : [ DatabaseModule ],
  controllers : [ CatsController ],
  components : [
    CatsService,
    ...catsProviders,
  ],
})
export class CatsModule {}