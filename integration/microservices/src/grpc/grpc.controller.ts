import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
  ClientGrpc,
  GrpcMethod,
} from '@nestjs/microservices';
import { Observable, of } from 'rxjs';
import { join } from 'path';

@Controller()
export class GrpcController {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'math',
      protoPath: join(__dirname, 'math.proto'),
    },
  })
  client: ClientGrpc;

  @Post()
  @HttpCode(200)
  call(@Body() data: number[]): Observable<number> {
    const svc = this.client.getService<any>('Math');
    return svc.sum(data);
  }

  @GrpcMethod('Math')
  async sum({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }
}
