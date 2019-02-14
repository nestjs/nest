import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Client, ClientGrpc, GrpcMethod, GrpcStream, Transport } from '@nestjs/microservices';
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

  @Post()
  @HttpCode(200)
  call(@Body() data: number[]): Observable<number> {
    const svc = this.client.getService<any>('Math');
    return svc.sum({ data });
  }

  @GrpcMethod('Math')
  async sum({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }

  @GrpcStream('Math')
  async sumStream(stream: any) {

    stream.on('data', (msg) => {
      console.log('DATA@!', msg);
      stream.write({result: 1});
    });

  }
}
