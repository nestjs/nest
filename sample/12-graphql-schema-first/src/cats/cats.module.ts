import { Module } from '@nestjs/common';
import { OwnersModule } from '../owners/owners.module.js';
import { CatOwnerResolver } from './cat-owner.resolver.js';
import { CatsResolver } from './cats.resolver.js';
import { CatsService } from './cats.service.js';

@Module({
  imports: [OwnersModule],
  providers: [CatsService, CatsResolver, CatOwnerResolver],
})
export class CatsModule {}
