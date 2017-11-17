import {Body, Controller, Get, Param, Post} from '@nestjs/common';

import {CatsService} from './cats.service';
import {CreateCatDto} from './dto/create-cat.dto';
import {Cat} from './interfaces/cat.interface';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> { return this.catsService.findAll(); }
}