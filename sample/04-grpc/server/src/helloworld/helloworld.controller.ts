// https://github.com/grpc/grpc-node/blob/master/examples/error_handling/server.js
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Observable, of, repeat } from 'rxjs';
import {
  GreeterController,
  HelloReply,
  HelloRequest,
} from '../interface/helloworld';
import { status } from '@grpc/grpc-js';

@Controller()
export class HelloworldController implements GreeterController {
  private readonly REPLY_COUNT = 5;

  @GrpcMethod('Greeter', 'sayHello')
  sayHello({ name }: HelloRequest): HelloReply {
    if (!name) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'request missing required field: name',
      });
    }

    return {
      message: 'Hello ' + name,
    };
  }

  @GrpcMethod('Greeter', 'sayHelloStreamReply')
  sayHelloStreamReply({ name }: HelloRequest): Observable<HelloReply> {
    if (!name) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'request missing required field: name',
      });
    }

    return of({ message: `Hello ${name}` }).pipe(repeat(this.REPLY_COUNT));
  }
}
