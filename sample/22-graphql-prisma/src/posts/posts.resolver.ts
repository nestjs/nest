import {
  Args,
  Info,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Post } from '../graphql.schema';
import { BatchPayload } from '../prisma/prisma.binding';
import { PrismaService } from '../prisma/prisma.service';

@Resolver()
export class PostsResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query('posts')
  async getPosts(@Args() args, @Info() info): Promise<Post[]> {
    return await this.prisma.query.posts(args, info);
  }

  @Query('post')
  async getPost(@Args() args, @Info() info): Promise<Post> {
    return await this.prisma.query.post(args, info);
  }

  @Mutation('createPost')
  async createPost(@Args() args, @Info() info): Promise<Post> {
    return await this.prisma.mutation.createPost(args, info);
  }

  @Mutation('updatePost')
  async updatePost(@Args() args, @Info() info): Promise<Post> {
    return await this.prisma.mutation.updatePost(args, info);
  }

  @Mutation('updateManyPosts')
  async updateManyPosts(@Args() args, @Info() info): Promise<BatchPayload> {
    return await this.prisma.mutation.updateManyPosts(args, info);
  }

  @Mutation('deletePost')
  async deletePost(@Args() args, @Info() info): Promise<Post> {
    return await this.prisma.mutation.deletePost(args, info);
  }

  @Mutation('deleteManyPosts')
  async deleteManyPosts(@Args() args, @Info() info): Promise<BatchPayload> {
    return await this.prisma.mutation.deleteManyPosts(args, info);
  }

  @Subscription('post')
  onPostMutation(@Args() args, @Info() info) {
    return this.prisma.subscription.post(args, info);
  }
}
