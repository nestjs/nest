import { Controller, Get } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Controller()
export class HttpController {
  @Get('hello')
  testMsvc() {
    const client = ClientProxyFactory.create({
      transport: Transport.TCP,
    });
    return client.send('test', { test: true });
  }
}
