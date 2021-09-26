import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Post } from './posts.interfaces';
import { PostsService } from './posts.service';

@Resolver('Post')
export class PostsResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query('findPost')
  findPost(@Args({ name: 'id', type: () => ID }) id: number) {
    return this.postsService.findOne(id);
  }

  @Query('getPosts')
  getPosts() {
    return this.postsService.findAll();
  }

  @ResolveField('user')
  user(@Parent() post: Post): any {
    return { __typename: 'User', id: post.authorId };
  }
}
