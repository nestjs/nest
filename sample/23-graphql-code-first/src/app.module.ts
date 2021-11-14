import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { RecipesModule } from './recipes/recipes.module';
import { ComplexityPlugin } from './common/plugins/complexity.plugin';
import { LoggingPlugin } from './common/plugins/logging.plugin';

@Module({
  providers: [ComplexityPlugin, LoggingPlugin],
  imports: [
    RecipesModule,
    GraphQLModule.forRoot({
      installSubscriptionHandlers: true,
      autoSchemaFile: 'schema.gql',
    }),
  ],
})
export class AppModule {}
