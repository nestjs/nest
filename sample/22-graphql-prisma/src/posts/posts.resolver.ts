import { Query, Resolver, Subscription, Mutation } from '@nestjs/graphql';
import { PrismaService } from '../prisma/prisma.service';
import { Post } from '../graphql.schema';

@Resolver()
export class PostsResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query('posts')
  async getPosts(obj, args, context, info): Promise<Post[]> {
    return await this.prisma.query.posts(args, info);
  }

  @Query('post')
  async getPost(obj, args, context, info): Promise<Post> {
    return await this.prisma.query.post(args, info);
  }

  @Mutation('createPost')
  async createPost(obj, args, context, info): Promise<Post> {
    return await this.prisma.mutation.createPost(args, info);
  }

  @Subscription('post')
  onUserMutation() {
    return {
      subscribe: (obj, args, ctx, info) => {
        return this.prisma.subscription.post(args, info);
      },
    };
  }
}
