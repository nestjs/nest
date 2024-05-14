/* eslint-disable */
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';

export const protobufPackage = 'helloworld';

/** The request message containing the user's name. */
export interface HelloRequest {
  name: string;
}

/** The response message containing the greetings */
export interface HelloReply {
  message: string;
}

export const HELLOWORLD_PACKAGE_NAME = 'helloworld';

/** The greeting service definition. */

export interface GreeterClient {
  /** Sends a greeting */

  sayHello(request: HelloRequest): Observable<HelloReply>;

  sayHelloStreamReply(request: HelloRequest): Observable<HelloReply>;
}

/** The greeting service definition. */

export interface GreeterController {
  /** Sends a greeting */

  sayHello(
    request: HelloRequest,
  ): Promise<HelloReply> | Observable<HelloReply> | HelloReply;

  sayHelloStreamReply(request: HelloRequest): Observable<HelloReply>;
}

export function GreeterControllerMethods() {
  return function (constructor: Function) {
    const grpcMethods: string[] = ['sayHello', 'sayHelloStreamReply'];
    for (const method of grpcMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(
        constructor.prototype,
        method,
      );
      GrpcMethod('Greeter', method)(
        constructor.prototype[method],
        method,
        descriptor,
      );
    }
    const grpcStreamMethods: string[] = [];
    for (const method of grpcStreamMethods) {
      const descriptor: any = Reflect.getOwnPropertyDescriptor(
        constructor.prototype,
        method,
      );
      GrpcStreamMethod('Greeter', method)(
        constructor.prototype[method],
        method,
        descriptor,
      );
    }
  };
}

export const GREETER_SERVICE_NAME = 'Greeter';
