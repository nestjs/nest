import { DynamicModule, Inject, Module, Provider } from '@nestjs/common';
import { HelloController } from './hello.controller.js';
import { HelloService } from './hello.service.js';
import { TestController } from './test.controller.js';
import { UsersService } from './users/users.service.js';

@Module({
  controllers: [HelloController, TestController],
  providers: [HelloService, UsersService],
})
export class HelloModule {
  constructor(@Inject('META') private readonly meta) {}

  static forRoot(meta: Provider): DynamicModule {
    return {
      module: HelloModule,
      providers: [meta],
    };
  }
}
