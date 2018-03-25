import { Controller, Get } from '@nestjs/common';
import {
  ClientProxy,
  Client,
  Transport,
  MessagePattern,
} from '@nestjs/microservices';
import { Observable } from 'rxjs/Observable';

@Controller()
export class MathController {
  @Client({ transport: Transport.TCP })
  client: ClientProxy;

  @Get()
  call(): Observable<number> {
    const pattern = { cmd: 'sum' };
    const data = [1, 2, 3, 4, 5];
    return this.client.send<number>(pattern, data);
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }
}
