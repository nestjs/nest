import { Controller, Get, Inject } from '@nestjs/common';
import { ClientKafka, MessagePattern, Payload } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { MATH_SERVICE } from './math.constants';

@Controller()
export class MathController {
  constructor(@Inject(MATH_SERVICE) private readonly client: ClientKafka) {}

  async onModuleInit() {
    this.client.subscribeToResponseOf('sum');
    this.client.subscribeToResponseOf('math');
    await this.client.connect();
  }

  @Get()
  execute(): Observable<number> {
    const pattern = 'sum';
    const data = [1, 2, 3, 4, 5];
    return this.client.send<number>(pattern, data);
  }

  @MessagePattern('sum')
  sum(@Payload() data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }
}
