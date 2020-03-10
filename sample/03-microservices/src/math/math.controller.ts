import { Controller, Get, Inject, Scope } from '@nestjs/common';
import { ClientProxy, CONTEXT, MessagePattern } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { MATH_SERVICE } from './math.constants';

@Controller({ scope: Scope.REQUEST })
export class MathController {
  constructor(
    @Inject(MATH_SERVICE) private readonly client: ClientProxy,
    @Inject(CONTEXT) private ctx: any,
  ) {}

  @Get()
  execute(): Observable<number> {
    const pattern = { cmd: 'sum' };
    const data = [1, 2, 3, 4, 5];
    return this.client.send<number>(pattern, data);
  }

  @MessagePattern({ cmd: 'sum' })
  sum(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }
}
