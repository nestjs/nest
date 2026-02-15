import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Guard } from './guards/request-scoped.guard.js';
import { Interceptor } from './interceptors/logging.interceptor.js';
import { UserByIdPipe } from './users/user-by-id.pipe.js';

@Controller('test')
export class TestController {
  @UseGuards(Guard)
  @UseInterceptors(Interceptor)
  @Get()
  greeting(@Param('id', UserByIdPipe) id): string {
    return 'hey';
  }
}
