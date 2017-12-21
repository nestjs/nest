import { Module } from '@nestjs/common';
import { GraphqlController } from './graphql.controller';

@Module({
  controllers: [
    GraphqlController
  ]
})
export class GraphqlModule {}
