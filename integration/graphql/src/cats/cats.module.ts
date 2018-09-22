import { Module } from '@nestjs/common';
import { CatsService } from './cats.service';
import { CatsResolvers } from './cats.resolvers';

@Module({
  providers: [CatsService, CatsResolvers],
})
export class CatsModule {}
