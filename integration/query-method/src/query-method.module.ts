import { Module } from '@nestjs/common';
import { QueryMethodController } from './query-method.controller';

@Module({ controllers: [QueryMethodController] })
export class QueryMethodModule {}
