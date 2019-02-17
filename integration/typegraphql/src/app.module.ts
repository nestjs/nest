import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    RecipesModule,
    GraphQLModule.forRoot({
      debug: false,
      installSubscriptionHandlers: true,
      autoSchemaFile: true,
    }),
  ],
})
export class ApplicationModule {}
