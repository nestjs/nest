import { Module } from '@nestjs/common';
import { PostsResolver } from './posts.resolver';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  providers: [PostsResolver],
  imports: [PrismaModule],
})
export class PostsModule {}
