import { Module } from '@nestjs/common';
import { PrismaModule } from './../prisma/prisma.module';
import { PostsResolver } from './posts.resolver';

@Module({
  providers: [PostsResolver],
  imports: [PrismaModule],
})
export class PostsModule {}
