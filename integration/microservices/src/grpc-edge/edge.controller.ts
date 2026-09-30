import { Controller } from '@nestjs/common';
import {
  GrpcMethod,
  GrpcStatus,
  GrpcStreamCall,
  GrpcStreamMethod,
  RpcException,
} from '@nestjs/microservices';
import { EMPTY, Observable } from 'rxjs';
import { ignoreElements } from 'rxjs/operators';

@Controller()
export class EdgeController {
  @GrpcMethod('Edge')
  completeEmpty() {
    return EMPTY;
  }

  @GrpcStreamMethod('Edge')
  collectEmpty(messages: Observable<unknown>) {
    return messages.pipe(ignoreElements());
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
}
