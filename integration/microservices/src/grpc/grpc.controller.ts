import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import {
  Client,
  MessagePattern,
  ClientProxy,
  Transport,
  GrpcRoute,
  ClientGrpc,
} from '@nestjs/microservices';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { join } from 'path';

@Controller()
export class GrpcController {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'math',
      protoPath: join(__dirname, 'math.proto'),
    }
  })
  client: ClientGrpc;

  @Post()
  @HttpCode(200)
  call(@Body() data: number[]): Observable<number> {
    const svc = this.client.getService<any>('Math');
    return svc.Sum(data);
  }

  @GrpcRoute('Math', 'Sum')
  async sum({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }
}
