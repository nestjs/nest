import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    ReflectMetadata,
    UseGuards,
    UseInterceptors
    } from '@nestjs/core';
import { Roles } from '../core/decorators/roles.decorator';
import { RolesGuard } from '../core/guards/roles.guard';
import { LoggingInterceptor } from '../core/interceptors/logging.interceptor';
import { TransformInterceptor } from '../core/interceptors/transform.interceptor';
import { ParseIntPipe } from '../core/pipes/parse-int.pipe';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './interfaces/cat.interface';

@Controller('cats')
@UseGuards(RolesGuard)
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  @Roles('admin')
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseIntPipe()) id) {
    // logic
  }
}
