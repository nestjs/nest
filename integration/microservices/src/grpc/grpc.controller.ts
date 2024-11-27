import { Body, Controller, HttpCode, Post, Query } from '@nestjs/common';
import {
  Client,
  ClientGrpc,
  ClientGrpcProxy,
  GrpcMethod,
  GrpcStreamCall,
  GrpcStreamMethod,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import { catchError, from, mergeMap, Observable, of } from 'rxjs';

class ErrorHandlingProxy extends ClientGrpcProxy {
  serializeError(err) {
    return new RpcException(err);
  }
}

@Controller()
export class GrpcController {
  private readonly customClient: ClientGrpc;
  constructor() {
    this.customClient = new ErrorHandlingProxy({
      package: 'math',
      protoPath: join(__dirname, 'math.proto'),
    });
  }

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
      protoPath: [
        join(__dirname, 'math.proto'),
        join(__dirname, 'math2.proto'),
      ],
    },
  })
  clientMulti: ClientGrpc;

  @Post('sum')
  @HttpCode(200)
  call(@Body() data: number[]): Observable<number> {
    const svc = this.client.getService<any>('Math');
    return svc.sum({ data });
  }

  // Test that getService generate both lower and uppercase method
  @Post('upperMethod/sum')
  @HttpCode(200)
  callWithOptions(@Body() data: number[]): Observable<number> {
    const svc = this.client.getService<any>('Math');
    return svc.Sum({ data });
  }

  @GrpcMethod('Math')
  async sum({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }

  @GrpcStreamMethod('Math')
  async sumStream(messages: Observable<any>): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      messages.subscribe({
        next: msg => {
          resolve({
            result: msg.data.reduce((a, b) => a + b),
          });
        },
        error: err => {
          reject(err as Error);
        },
      });
    });
  }

  @GrpcStreamCall('Math')
  async sumStreamPass(stream: any) {
    stream.on('data', (msg: any) => {
      stream.write({ result: msg.data.reduce((a, b) => a + b) });
    });
  }

  @GrpcMethod('Math')
  async divide(request: { dividend: number; divisor: number }): Promise<any> {
    if (request.divisor === 0) {
      throw new RpcException({
        code: 3,
        message: 'dividing by 0 is not possible',
      });
    }
    return {
      result: request.dividend / request.divisor,
    };
  }

  // contrived example meant to show when an error is encountered, like dividing by zero, the
  // application does not crash and the error is returned appropriately to the client
  @GrpcMethod('Math', 'StreamDivide')
  streamDivide({
    data,
  }: {
    data: { dividend: number; divisor: number }[];
  }): Observable<any> {
    return from(data).pipe(mergeMap(request => this.divide(request)));
  }

  @GrpcMethod('Math2')
  async sum2({ data }: { data: number[] }): Promise<any> {
    return of({
      result: data.reduce((a, b) => a + b),
    });
  }

  @Post('multi/sum')
  @HttpCode(200)
  callMultiSum(@Body() data: number[]): Observable<number> {
    const svc = this.clientMulti.getService<any>('Math');
    return svc.sum({ data });
  }

  @Post('multi/sum2')
  @HttpCode(200)
  callMultiSum2(@Body() data: number[]): Observable<number> {
    const svc = this.clientMulti.getService<any>('Math2');
    return svc.sum2({ data });
  }

  @GrpcMethod('Math')
  streamLargeMessages(_req: unknown, _meta: unknown) {
    // Send 1000 messages of >1MB each relatively fast
    // This should be enough to trigger backpressure issues
    // while writing to the socket.
    return new Observable(subscriber => {
      let n = 0;
      const interval = setInterval(() => {
        // We'll be checking the ids. The `data` is just to make the
        // message large enough to trigger backpressure issues.
        subscriber.next({ id: n++, data: 'a'.repeat(1024 * 1024) });
        if (n === 1000) {
          subscriber.complete();
        }
      }, 0);
      return () => {
        clearInterval(interval);
      };
    });
  }

  @Post('error')
  @HttpCode(200)
  serializeError(
    @Query('client') query: 'custom' | 'standard' = 'standard',
    @Body() body: Record<string, any>,
  ): Observable<boolean> {
    const client = query === 'custom' ? this.customClient : this.client;
    const svc = client.getService<any>('Math');

    const errorDivideRequest = {
      dividend: 1,
      divisor: 0,
    };
    return svc.divide(errorDivideRequest).pipe(
      catchError(err => {
        return of(err instanceof RpcException);
      }),
    );
  }
}
