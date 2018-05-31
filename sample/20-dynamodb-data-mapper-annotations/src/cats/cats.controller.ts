import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './schemas/cat.schema';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post('createTable')
  async createTable() {
    await this.catsService.createCatsTable()
      .catch(error => console.error(error));
  }

  @Post('deleteTable')
  async deleteTable() {
    await this.catsService.deleteCatsTable()
      .catch(error => console.error(error));
  }

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto)
      .catch(error => console.error(error));
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll()
      .catch(error => {
        console.error(error);
        return [];
      });
  }
}
