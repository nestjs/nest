import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { UnauthorizedFilter } from '../common/filters/unathorized.filter';
import { DateScalar } from '../common/scalars/date.scalar';
import { RecipesResolver } from './recipes.resolver';
import { RecipesService } from './recipes.service';

@Module({
  providers: [
    RecipesResolver,
    RecipesService,
    DateScalar,
    {
      provide: APP_FILTER,
      useClass: UnauthorizedFilter,
    },
  ],
})
export class RecipesModule {}
