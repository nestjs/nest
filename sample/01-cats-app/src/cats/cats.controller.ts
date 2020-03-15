import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseIntPipe } from '../common/pipes/parse-int.pipe';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './interfaces/cat.interface';

@UseGuards(RolesGuard)
@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Post()
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    if (false) {
      /*
      {
        "statusCode": 401,
        "message": "sfafsa"
      }
      */
      throw new HttpException('sfafsa', 401);
    }
    if (true) {
      /**
       * {
        "statusCode": 403,
        "error": "Forbidden",
        "message": "sfafsa"
        }
       */
      const err = new ForbiddenException();
      console.log(err.message);
      throw err;
    }
    if (false) {
      /**
       * {
        "statusCode": 403,
        "error": "Forbidden",
        }
       */
      throw new ForbiddenException();
    }
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseIntPipe())
    id: number,
  ) {
    // get by ID logic
  }
}
