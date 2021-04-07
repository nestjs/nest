import { DynamicModule, Inject, Module, Provider } from '@nestjs/common';

import { UsersService } from './users/users.service';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';

@Module({
  controllers: [HelloController],
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
