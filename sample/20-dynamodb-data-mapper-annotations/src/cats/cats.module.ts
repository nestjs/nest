import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

import { DynamoDBDataMapperModule } from '../dynamodb-data-mapper/dynamodb-data-mapper.module';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
  imports: [DynamoDBDataMapperModule],
})
export class CatsModule {}
