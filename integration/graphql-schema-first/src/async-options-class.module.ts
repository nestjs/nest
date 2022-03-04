import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GqlOptionsFactory, GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { CatsModule } from './cats/cats.module';

class ConfigService implements GqlOptionsFactory {
  createGqlOptions(): ApolloDriverConfig {
    return {
      typePaths: [join(__dirname, '**', '*.graphql')],
    };
  }
}

@Module({
  imports: [
    CatsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useClass: ConfigService,
    }),
  ],
})
export class AsyncClassApplicationModule {}
