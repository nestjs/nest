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
  async findOneById(obj, args, context, info): Promise<Cat> {
    const { id } = args;
    return await this.catsService.findOneById(+id);
  }

  @Mutation('createCat')
  async create(obj, args: Cat, context, info): Promise<Cat> {
    return await this.catsService.create(args);
  }
}
