import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    RecipesModule,
    GraphQLModule.forRoot({
      debug: false,
      installSubscriptionHandlers: true,
      autoSchemaFile: join(
        process.cwd(),
        'integration/graphql-code-first/schema.gql',
      ),
    }),
  ],
})
export class ApplicationModule {}
