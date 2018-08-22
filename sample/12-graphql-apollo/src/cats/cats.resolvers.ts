import { UseGuards } from '@nestjs/common';
import { Mutation, Query, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { CatsGuard } from './cats.guard';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

const pubSub = new PubSub();

@Resolver('Cat')
export class CatsResolvers {
  constructor(private readonly catsService: CatsService) {}

  @Query()
  @UseGuards(CatsGuard)
  async getCats() {
    return await this.catsService.findAll();
  }

  @Query('cat')
  async findOneById(obj, args, context, info): Promise<Cat> {
    const { id } = args;
    return await this.catsService.findOneById(+id);
  }

  @Mutation('createCat')
  async create(obj, args: Cat, context, info): Promise<Cat> {
    const createdCat = await this.catsService.create(args);
    pubSub.publish('catCreated', { catCreated: createdCat });
    return createdCat;
  }

  @Subscription('catCreated')
  catCreated() {
    return {
      subscribe: () => pubSub.asyncIterator('catCreated'),
    };
  }
}
