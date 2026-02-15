import { Module } from '@nestjs/common';
import { DateScalar } from '../common/scalars/date.scalar.js';
import { RecipesResolver } from './recipes.resolver.js';
import { RecipesService } from './recipes.service.js';

@Module({
  providers: [RecipesResolver, RecipesService, DateScalar],
})
export class RecipesModule {}
