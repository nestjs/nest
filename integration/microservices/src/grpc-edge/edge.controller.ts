import { Controller } from '@nestjs/common';
import {
  GrpcMethod,
  GrpcStatus,
  GrpcStreamCall,
  GrpcStreamMethod,
  RpcException,
} from '@nestjs/microservices';
import { EMPTY, Observable, Subject } from 'rxjs';
import { ignoreElements, map, toArray } from 'rxjs/operators';

@Controller()
export class EdgeController {
  readonly echoRejectRequestEvents: string[] = [];

  @GrpcMethod('Edge')
  completeEmpty() {
    return EMPTY;
  }

  @GrpcStreamMethod('Edge')
  collectEmpty(messages: Observable<unknown>) {
    return messages.pipe(ignoreElements());
  }

  @GrpcStreamMethod('Edge')
  collectVoid(messages: Observable<unknown>) {
    return messages.pipe(
      toArray(),
      map(() => undefined),
    );
  }

  @GrpcStreamCall('Edge')
  echoThrow() {
    throw new RpcException({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: 'echo rejected',
    });
  }

  @GrpcStreamCall('Edge')
  collectThrow() {
    throw new RpcException({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: 'collect rejected',
    });
  }

  @GrpcStreamMethod('Edge')
  echoReject(messages: Observable<unknown>) {
    const response = new Subject<unknown>();
    messages.subscribe({
      next: () =>
        response.error(
          new RpcException({
            code: GrpcStatus.INVALID_ARGUMENT,
            message: 'echo rejected',
          }),
        ),
      error: () => this.echoRejectRequestEvents.push('error'),
      complete: () => this.echoRejectRequestEvents.push('complete'),
    });
    return response;
  }
}
