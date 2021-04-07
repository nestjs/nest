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
import { UsersService } from './users/users.service';
import { HelloService } from './hello.service';

@Controller('hello')
export class HelloController {
  static COUNTER = 0;
  constructor(
    private readonly helloService: HelloService,
    private readonly usersService: UsersService,
  ) {
    HelloController.COUNTER++;
  }

  @UseGuards(Guard)
  @UseInterceptors(Interceptor)
  @Get()
  greeting(@Param('id', UserByIdPipe) id): string {
    return this.helloService.greeting();
  }
}
