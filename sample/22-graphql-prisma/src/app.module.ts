import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { PrismaModule } from './prisma/prisma.module';
import { PostsModule } from './posts/posts.module';
import { GraphqlOptions } from 'graphql.options';

@Module({
  imports: [
    GraphQLModule.forRootAsync({
      useClass: GraphqlOptions,
    }),
    PrismaModule,
    PostsModule,
  ],
})
export class ApplicationModule {}
