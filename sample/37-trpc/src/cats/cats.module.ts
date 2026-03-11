import { Module } from '@nestjs/common';
import { CatsRouter } from './cats.router';
import { CatsService } from './cats.service';

@Module({
  providers: [CatsService, CatsRouter],
  exports: [CatsService],
})
export class CatsModule {}
