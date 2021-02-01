import { ParseIntPipe, UseGuards } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver, Subscription } from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import { Cat, Owner } from '../graphql.schema';
import { CatsGuard } from './cats.guard';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { OwnersService } from "../../../../integration/graphql-schema-first/src/owners/owners.service";

const pubSub = new PubSub();

@Resolver('Cat')
export class CatsResolvers {
  constructor(
    private readonly ownersService: OwnersService,
    private readonly catsService: CatsService
  ) {}

  @Query()
  @UseGuards(CatsGuard)
  async getCats() {
    return this.catsService.findAll();
  }

  @Query('cat')
  async findOneById(
    @Args('id', ParseIntPipe)
    id: number,
  ): Promise<Cat> {
    return this.catsService.findOneById(id);
  }

  @Mutation('createCat')
  async create(@Args('createCatInput') args: CreateCatDto): Promise<Cat> {
    const createdCat = await this.catsService.create(args);
    pubSub.publish('catCreated', { catCreated: createdCat });
    return createdCat;
  }

  @Subscription('catCreated')
  catCreated() {
    return pubSub.asyncIterator('catCreated');
  }

  @ResolveField()
  async owner(@Parent() cat: Cat): Promise<Owner>{
    return this.ownersService.findOneById(cat.ownerId);
  }
}
