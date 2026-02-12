import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PostsService } from './posts.service.js';
import { User } from './users.interfaces.js';

@Resolver('User')
export class UsersResolver {
  constructor(private readonly postsService: PostsService) {}

  @ResolveField('posts')
  public posts(@Parent() user: User) {
    return this.postsService.findOneByAuthorId(user.id);
  }
}
