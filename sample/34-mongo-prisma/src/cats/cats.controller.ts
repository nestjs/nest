import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Cats } from '@prisma/client';
import { CatsService } from './cats.service';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Get()
  async getAllCats(): Promise<Cats[]> {
    return this.catsService.getAllCats();
  }

  @Get(':id')
  async getCat(@Param('id') id: string): Promise<Cats> {
    return this.catsService.getCat(id);
  }

  @Post()
  async createCat(@Body() cat: Cats): Promise<Cats> {
    return this.catsService.createCat(cat);
  }

  @Put(':id')
  async updateCat(@Param('id') id: string, @Body() cat: Cats): Promise<Cats> {
    return this.catsService.updateCat(id, cat);
  }

  @Delete(':id')
  async deleteCat(@Param('id') id: string): Promise<Cats> {
    return this.catsService.deleteCat(id);
  }
}
