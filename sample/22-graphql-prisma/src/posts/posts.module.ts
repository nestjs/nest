import { Module } from '@nestjs/common';
import { PostsResolvers } from './posts.resolvers.js';
import { PostsService } from './posts.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  providers: [PostsResolvers, PostsService],
  imports: [PrismaModule],
})
export class PostsModule {}
