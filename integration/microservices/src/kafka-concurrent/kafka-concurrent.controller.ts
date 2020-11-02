import { PartitionerArgs } from 'kafkajs';

import { Body, Controller, HttpCode, OnModuleInit, OnModuleDestroy, Post, Scope } from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { Client, ClientKafka, Transport } from '@nestjs/microservices';
import { Observable } from 'rxjs';

import { SumDto } from './dtos/sum.dto';

/**
 * The following function explicity sends messages to the key representing the partition.
 */
const explicitPartitioner = () => {
  return ({
    message
  }: PartitionerArgs) => {
    return parseFloat(message.key.toString());
  };
}

@Controller()
export class KafkaConcurrentController implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(KafkaConcurrentController.name);

  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
      producer: {
        createPartitioner: explicitPartitioner
      }
    },
  })
  private readonly client: ClientKafka;

  async onModuleInit() {
    const requestPatterns = [
      'math.sum.sync.number.wait'
    ];

    requestPatterns.forEach(pattern => {
      this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  @Post('mathSumSyncNumberWait')
  @HttpCode(200)
  async mathSumSyncNumberWait(@Body() data: SumDto): Promise<Observable<any>> {
    const result = await this.client
      .send('math.sum.sync.number.wait', {
        key: data.key,
        value: data.numbers
      })
      .toPromise();

    return result;
  }
}
