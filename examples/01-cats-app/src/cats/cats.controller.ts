import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  ReflectMetadata,
  UseInterceptors,
  Param,
} from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { ParseIntPipe } from '../common/pipes/parse-int.pipe';
import {ClientProxy, Transport,Client} from "@nestjs/microservices";
import {Observable} from "rxjs/Observable";

@Controller('cats')
@UseGuards(RolesGuard)
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Client({ transport: Transport.TCP, port: 3006 })
  client: ClientProxy;
  @Post()
  @Roles('admin')
  async create(@Body() createCatDto: CreateCatDto) {
    this.catsService.create(createCatDto);
  }

  @Get('/micro')
  testMicroservice():Observable<number>{
      const pattern = { cmd: 'sum' };
      const data = [1, 2, 3, 4, 5];

      return this.client.send<number>(pattern, data);
  }

    @Get('/microErr')
    testMicroserviceUnknowPattern():Observable<number>{
        const pattern = { cmd: 'sum1' };
        const data = [1, 2, 3, 4, 5];

        return this.client.send<number>(pattern, data);
    }

  @Get()
  async findAll(): Promise<Cat[]> {
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
