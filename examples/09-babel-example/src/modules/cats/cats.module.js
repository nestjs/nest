import { Module } from '@nestjs/core';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  components: [CatsService],
})
export class CatsModule {}
