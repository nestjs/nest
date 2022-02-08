import { Injectable } from '@nestjs/common';
import { Post } from '@prisma/client';
import { NewPost, UpdatePost } from 'src/graphql.schema';
import { PrismaService } from '../prisma/prisma.service';
import { PubSub } from 'graphql-subscriptions';
import { Subscription } from '@nestjs/graphql';

const pubSub = new PubSub();

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: {
        id,
      },
    });
  }

  async findAll(): Promise<Post[]> {
    return this.prisma.post.findMany({});
  }

  async create(input: NewPost): Promise<Post> {
    const createdPost = await this.prisma.post.create({
      data: input,
    });
    pubSub.publish('postCreated', { postCreated: createdPost });
    return createdPost;
  }

  async update(params: UpdatePost): Promise<Post> {
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

  async delete(id: string): Promise<Post> {
    return this.prisma.post.delete({
      where: {
        id,
      },
    });
  }

  @Subscription('postCreated')
  postCreated() {
    return pubSub.asyncIterator('postCreated');
  }
}
