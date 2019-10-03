import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Client, ClientGrpc, GrpcMethod, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, of } from 'rxjs';

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

  @Client({
    transport: Transport.GRPC,
    options: {
      package: ['math', 'math2'],
      protoPath: [join(__dirname, 'math.proto'), join(__dirname, 'math2.proto')],
    },
  })
  client2: ClientGrpc;

  @Post()
  @HttpCode(200)
  call(@Body() data: number[]): Observable<number> {
    const svc = this.client.getService<any>('Math');
    return svc.sum({ data });
  }

  @Post()
  @HttpCode(200)
  call2(@Body() data: number[]): Observable<number> {
    const svc = this.client2.getService<any>('Math2');
    return svc.sum({ data });
  }

  @GrpcMethod('Math')
  async sum({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }

  @GrpcMethod('Math2')
  async sum2({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }
}
