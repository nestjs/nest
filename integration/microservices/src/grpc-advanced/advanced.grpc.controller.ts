import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  Client,
  ClientGrpc,
  GrpcMethod,
  GrpcStreamCall,
  GrpcStreamMethod,
  Transport,
} from '@nestjs/microservices';
import { join } from 'path';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';
import { Metadata } from 'grpc';

@Controller()
export class AdvancedGrpcController {
  /*
   *  HTTP Proxy Client defines loading pattern
   */
  @Client({
    transport: Transport.GRPC,
    options: {
      url: 'localhost:5001',
      package: 'proto_example.orders',
      protoPath: 'root.proto',
      loader: {
        includeDirs: [join(__dirname, './proto')],
        keepCase: true,
      },
    },
  })
  client: ClientGrpc;

  /**
   * HTTP Proxy entry for support non-stream find method
   * @param id
   */
  @Post()
  @HttpCode(200)
  call(@Body() id: number): Observable<number> {
    const svc = this.client.getService<any>('OrderService');
    return svc.find({ id });
  }

  /**
   * HTTP Proxy entry for support client-side stream find method
   * @param id
   */
  @Post('client-streaming')
  @HttpCode(200)
  stream(): Observable<number> {
    const svc = this.client.getService<any>('OrderService');
    const upstream = new ReplaySubject();
    upstream.next({
      id: 1,
      itemTypes: [1],
      shipmentType: {
        from: 'test',
        to: 'test1',
        carrier: 'test-carrier',
      },
    });
    upstream.complete();
    return svc.streamReq(upstream);
  }

  /**
   * GRPC stub for Find method
   * @param id
   */
  @GrpcMethod('orders.OrderService')
  async find({ id }: { id: number }): Promise<any> {
    return of({
      id: 1,
      itemTypes: [1],
      shipmentType: {
        from: 'test',
        to: 'test1',
        carrier: 'test-carrier',
      },
    });
  }

  /**
   * GRPC stub implementation for sync stream method
   * @param messages
   */
  @GrpcStreamMethod('orders.OrderService')
  async sync(messages: Observable<any>, metadata: Metadata, sendMetadata): Promise<any> {
    // Set Set-Cookie from Metadata
    const srvMetadata = new Metadata();
    srvMetadata.add('Set-Cookie', 'test_cookie=abcd');
    sendMetadata(srvMetadata);

    const s = new Subject();
    const o = s.asObservable();
    messages.subscribe(msg => {
      s.next({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });
    return o;
  }

  /**
   * GRPC stub implementation for syncCall stream method (implemented through call)
   * @param stream
   */
  @GrpcStreamCall('orders.OrderService')
  async syncCall(stream: any) {
    stream.on('data', (msg: any) => {
      stream.write({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });
  }

  @GrpcStreamMethod('orders.OrderService')
  async streamReq(messages: Observable<any>): Promise<any> {
    const s = new Subject();
    const o = s.asObservable();
    messages.subscribe(
      msg => {
        s.next({
          id: 1,
          itemTypes: [1],
          shipmentType: {
            from: 'test',
            to: 'test1',
            carrier: 'test-carrier',
          },
        });
      },
      null,
      () => s.complete(),
    );
    return o;
  }

  @GrpcStreamCall('orders.OrderService')
  async streamReqCall(stream: any, callback: Function) {
    stream.on('data', (msg: any) => {
      // process msg
    });
    stream.on('end', () => {
      callback(null, {
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });
  }
}
