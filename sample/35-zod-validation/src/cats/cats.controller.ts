import { Body, Controller, Get, Post } from '@nestjs/common';
import { CatsService } from './cats.service.js';
import { CreateCatDto, CreateCatSchema } from './dto/create-cat.dto.js';
import { Cat } from './interfaces/cat.interface.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  create(@Body({ schema: CreateCatSchema }) createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  findAll(): Cat[] {
    return this.catsService.findAll();
  }
}
