import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';
import { DynamoDBDataMapperModule } from './dynamodb-data-mapper/dynamodb-data-mapper.module';

@Module({
  imports: [
    CatsModule,
    DynamoDBDataMapperModule,
  ],
})
export class ApplicationModule {}
