import {
  Body,
  Catch,
  Controller,
  Get,
  Param,
  Post,
  Scope,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AsyncContext } from '@nestjs/core/hooks/async-context';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { ParseIntPipe } from '../common/pipes/parse-int.pipe';
import { CatsService, Rawr } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './interfaces/cat.interface';
@Catch()
@Controller('cats', {
  scope: Scope.REQUEST,
})
@UseGuards(RolesGuard)
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
export class CatsController {
  constructor(
    private readonly catsService: CatsService,
    private readonly asyncContext: AsyncContext,
    private readonly rawr: Rawr,
  ) {
    console.log('Cats controller has been created (request)');
  }

  @Post()
  @Roles('admin')
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get()
  async findAll(): Promise<Cat[]> {
    const random = Math.random();
    console.log(random, this.rawr);
    console.log(
      ((this.asyncContext as any).internalStorage as Map<any, any>).size,
    );
    this.asyncContext.set('xd', random);
    return this.catsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseIntPipe())
    id,
  ) {
    // logic
  }
}
