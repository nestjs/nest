import { DynamicModule, Inject, Module, Provider, Scope } from '@nestjs/common';
import { HelloController } from './hello.controller.js';
import { HelloService } from './hello.service.js';
import { HttpController } from './http.controller.js';
import { UsersService } from './users/users.service.js';

@Module({
  controllers: [HelloController, HttpController],
  providers: [
    HelloService,
    UsersService,
    {
      provide: 'REQUEST_ID',
      useFactory: () => 1,
      scope: Scope.REQUEST,
    },
  ],
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
