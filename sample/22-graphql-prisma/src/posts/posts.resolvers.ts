import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { PostService } from './posts.service';
import { Post, NewPost, UpdatePost } from 'src/graphql.schema';

@Resolver('Post')
export class PostResolvers {
  constructor(private readonly postService: PostService) {}

  @Query('posts')
  async posts(): Promise<Post[]> {
    return this.postService.posts();
  }

  @Query('post')
  async post(@Args('id') args: string): Promise<Post> {
    return this.postService.post(args);
  }

  @Mutation('createPost')
  async create(@Args('input') args: NewPost): Promise<Post> {
    return this.postService.createPost(args);
  }

  @Mutation('updatePost')
  async update(@Args('input') args: UpdatePost): Promise<Post> {
    return this.postService.updatePost(args);
  }

  @Mutation('deletePost')
  async delete(@Args('id') args: string): Promise<Post> {
    return this.postService.deletePost(args);
  }
}
