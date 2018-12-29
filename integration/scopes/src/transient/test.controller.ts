import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Guard } from './guards/request-scoped.guard';
import { Interceptor } from './interceptors/logging.interceptor';
import { UserByIdPipe } from './users/user-by-id.pipe';

@Controller('test')
export class TestController {
  @UseGuards(Guard)
  @UseInterceptors(Interceptor)
  @Get()
  greeting(@Param('id', UserByIdPipe) id): string {
    return 'hey';
  }
}
