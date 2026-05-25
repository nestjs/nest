import { Module } from '@nestjs/common';
import { PostsModule } from './posts/posts.module.js';

@Module({
  imports: [PostsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
