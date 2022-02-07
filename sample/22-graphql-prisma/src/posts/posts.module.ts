import { Module } from '@nestjs/common';
import { PostResolvers } from './posts.resolvers';
import { PostService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [PostResolvers, PostService],
  imports: [PrismaModule],
})
export class PostModule {}
