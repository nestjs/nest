import { Roles } from '#root/common/decorators/roles.decorator.js';
import { RolesGuard } from '#root/common/guards/roles.guard.js';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Cat } from './interfaces/cat.interface.js';
import { ParseIntPipe } from '#root/common/pipes/parse-int.pipe.js';
import { CreateCatDto } from './dto/create-cat.dto.js';
import { CatsService } from './cats.service.js';

// @UseGuards(RolesGuard)
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  @Roles(['admin'])
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    console.log(this.catsService);
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseIntPipe())
    id: number,
  ) {
    // Retrieve a Cat instance by ID
    console.log(id);
  }
}
