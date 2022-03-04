import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { CatsModule } from './cats/cats.module';
import { ConfigModule } from './config.module';
import { ConfigService } from './config.service';

@Module({
  imports: [
    CatsModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useExisting: ConfigService,
    }),
  ],
})
export class AsyncExistingApplicationModule {}
