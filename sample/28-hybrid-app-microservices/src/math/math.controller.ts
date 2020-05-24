import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload, Transport,ClientTCP, ClientKafka} from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { MATH_TCP_SERVICE } from './math.constants';


@Controller()
export class MathController {
  constructor(@Inject(MATH_TCP_SERVICE) private readonly tcpClient: ClientTCP) {}

  @Get()
  tcpExecute(): Observable<number> {
    const pattern = { cmd: 'sum' };
    const data = [1, 2, 3, 4, 5];
    return this.tcpClient.send<number>(pattern, data);
  }

  @Get('share')
  shareTcpExecute(): Observable<number> {
    const pattern = 'sum-cmd-topic';
    const data = [1, 2, 3, 4, 5];
    return this.tcpClient.send<number>(pattern, data);
  }

  // Share handle function for KAFKA and TCP services
  @MessagePattern('sum-cmd-topic')
  sum(message: any): number {
    const data = Array.isArray(message) ? message : message.value;
    return (data || []).reduce((a, b) => a + b);
  }

  // handle function for KAFKA transport service
  @MessagePattern('sum', Transport.KAFKA)
  kafkaSum(@Payload() message: Record<string, any>): number {
    return (message.value || []).reduce((a, b) => a + b);
  }

  // handle function for TCP transport service
  @MessagePattern({ cmd: 'sum' }, Transport.TCP)
  tcpSum(data: number[]): number {
    return (data || []).reduce((a, b) => a + b);
  }
}
