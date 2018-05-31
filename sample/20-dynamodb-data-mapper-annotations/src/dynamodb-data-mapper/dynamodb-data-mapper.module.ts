import { Module } from '@nestjs/common';
import { DynamoDBDataMapperService } from './dynamodb-data-mapper.service';

@Module({
  providers: [DynamoDBDataMapperService],
  exports: [DynamoDBDataMapperService],
})
export class DynamoDBDataMapperModule {}