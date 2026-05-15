import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import {
  ApolloFederationDriver,
  ApolloFederationDriverConfig,
} from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { User } from './models/user.model.js';
import { PostsResolver } from './posts.resolver.js';
import { PostsService } from './posts.service.js';
import { UsersResolver } from './users.resolver.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      plugins: [ApolloServerPluginInlineTrace() as any],
      buildSchemaOptions: {
        orphanedTypes: [User],
      },
    }),
  ],
  providers: [PostsService, PostsResolver, UsersResolver],
})
export class PostsModule {}
