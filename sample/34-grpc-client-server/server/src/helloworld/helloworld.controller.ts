// https://github.com/grpc/grpc-node/blob/master/examples/error_handling/server.js
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Observable, ReplaySubject } from 'rxjs';
import {
  GreeterController,
  HelloReply,
  HelloRequest,
} from '../interface/helloworld';
import * as grpc from '@grpc/grpc-js';

@Controller()
export class HelloworldController implements GreeterController {
  private readonly REPLY_COUNT = 5;

  @GrpcMethod('Greeter', 'sayHello')
  sayHello(request: HelloRequest): HelloReply {
    if (request.name === '') {
      throw new RpcException({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'request missing required field: name',
      });
    }

    return {
      message: 'Hello ' + request.name,
    };
  }

  @GrpcMethod('Greeter', 'sayHelloStreamReply')
  sayHelloStreamReply(request: HelloRequest): Observable<HelloReply> {
    const hero$ = new ReplaySubject<HelloReply>();

    if (request.name === '') {
      hero$.error(
        new RpcException({
          code: grpc.status.INVALID_ARGUMENT,
          message: 'request missing required field: name',
        }),
      );

      return hero$.asObservable();
    }

    for (let i = 0; i < this.REPLY_COUNT; i++) {
      hero$.next({ message: 'Hello ' + request.name });
    }
    hero$.complete();

    return hero$.asObservable();
  }
}
