import { Module } from '@nestjs/common';
import { CatsResolvers } from './cats.resolvers';
import { CatsService } from './cats.service';

@Module({
  providers: [CatsService, CatsResolvers],
})
export class CatsModule {}
