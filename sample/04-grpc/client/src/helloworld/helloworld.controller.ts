// https://github.com/grpc/grpc-node/blob/master/examples/error_handling/client.js
import { Controller, Get, Inject, OnModuleInit, Param } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { map, Observable } from 'rxjs';
import { toArray } from 'rxjs/operators';
import { GREETER_SERVICE_NAME, GreeterClient } from '../interface/helloworld';

@Controller('helloworld')
export class HelloworldController implements OnModuleInit {
  private greeterClient: GreeterClient;

  constructor(
    @Inject('HELLOWORLD_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.greeterClient =
      this.client.getService<GreeterClient>(GREETER_SERVICE_NAME);
  }

  @Get('/unary/:name')
  sayHello(@Param('name') name: string): Observable<string> {
    const stream$ = this.greeterClient.sayHello({ name });

    return stream$.pipe(map(({ message }) => message));
  }

  @Get('/streaming/:name')
  sayHelloStreamReply(@Param('name') name: string): Observable<string[]> {
    const stream$ = this.greeterClient.sayHelloStreamReply({ name });

    return stream$.pipe(
      map(({ message }) => message),
      toArray(),
    );
  }
}
