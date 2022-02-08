import { Module } from '@nestjs/common';
import { PostsResolvers } from './posts.resolvers';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [PostsResolvers, PostsService],
  imports: [PrismaModule],
})
export class PostsModule {}
