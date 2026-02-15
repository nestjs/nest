import { Injectable } from '@nestjs/common';
import { Post } from '../generated/prisma/client.js';
import { NewPost, UpdatePost } from '../graphql.schema.js';
import { PrismaService } from '../prisma/prisma.service.js';

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
    return this.prisma.post.create({
      data: input,
    });
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
}
