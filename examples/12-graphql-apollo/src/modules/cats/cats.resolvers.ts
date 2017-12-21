import { Component, UseGuards } from '@nestjs/common';
import { Query, Mutation, Resolver, DelegateProperty } from '@nestjs/graphql';

import { Cat } from './interfaces/cat.interface';
import { CatsService } from './cats.service';
import { CatsGuard } from './cats.guard';
import { MergeInfo } from 'graphql-tools/dist/Interfaces';

@Resolver('Cat')
export class CatsResolvers {
  constructor(private readonly catsService: CatsService) {}

  @Query()
  @UseGuards(CatsGuard)
  async getCats() {
    return await this.catsService.findAll();
  }

  @Query('cat')
  async findOneById(id: number) {
    return await this.catsService.findOneById(id);
  }

  @Mutation('createCat')
  async create(cat: Cat) {
    await this.catsService.create(cat);
  }

  @DelegateProperty('human')
  findHumansById(cat: Cat) {
    return (mergeInfo: MergeInfo) => ({
      fragment: `fragment CatFragment on Cat { humanId }`,
      resolve(parent, args, context, info) {
        const humanId = parent.id;
        return mergeInfo.delegate(
          'query',
          'humanById',
          {
            id: humanId
          },
          context,
          info
        );
      }
    });
  }
}
