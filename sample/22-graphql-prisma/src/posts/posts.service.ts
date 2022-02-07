import { Injectable } from '@nestjs/common';
import { Post } from '@prisma/client';
import { NewPost, UpdatePost } from 'src/graphql.schema';
import { PrismaService } from '../prisma/prisma.service';
import { PubSub } from 'graphql-subscriptions';
import { Subscription } from '@nestjs/graphql';

const pubSub = new PubSub();

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async post(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: {
        id,
      },
    });
  }

  async posts(): Promise<Post[]> {
    return this.prisma.post.findMany({});
  }

  async createPost(input: NewPost): Promise<Post> {
    const createdPost = await this.prisma.post.create({
      data: input,
    });
    pubSub.publish('postCreated', { postCreated: createdPost });
    return createdPost;
  }

  async updatePost(params: UpdatePost): Promise<Post> {
    const { id, ...params_without_id } = params;

    return this.prisma.post.update({
      where: {
        id,
      },
      data: {
        ...params_without_id,
      },
    });
  }

  async deletePost(id: string): Promise<Post> {
    return this.prisma.post.delete({
      where: {
        id,
      },
    });
  }

  @Subscription('postCreated')
  catCreated() {
    return pubSub.asyncIterator('postCreated');
  }
}
