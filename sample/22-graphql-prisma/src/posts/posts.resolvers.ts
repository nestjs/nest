import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { PostsService } from './posts.service';
import { Post, NewPost, UpdatePost } from 'src/graphql.schema';

@Resolver('Post')
export class PostsResolvers {
  constructor(private readonly postService: PostsService) {}

  @Query('posts')
  async posts(): Promise<Post[]> {
    return this.postService.findAll();
  }

  @Query('post')
  async post(@Args('id') args: string): Promise<Post> {
    return this.postService.findOne(args);
  }

  @Mutation('createPost')
  async create(@Args('input') args: NewPost): Promise<Post> {
    return this.postService.create(args);
  }

  @Mutation('updatePost')
  async update(@Args('input') args: UpdatePost): Promise<Post> {
    return this.postService.update(args);
  }

  @Mutation('deletePost')
  async delete(@Args('id') args: string): Promise<Post> {
    return this.postService.delete(args);
  }
}
