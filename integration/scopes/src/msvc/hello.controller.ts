import { Controller, UseGuards, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

import { Guard } from './guards/request-scoped.guard';
import { Interceptor } from './interceptors/logging.interceptor';
import { UsersService } from './users/users.service';
import { HelloService } from './hello.service';

@Controller()
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
  @MessagePattern('test')
  greeting(): string {
    return this.helloService.greeting();
  }
}
