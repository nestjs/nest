import { Observable } from 'rxjs';

import { Body, Controller, HttpCode, OnModuleInit, OnModuleDestroy, Post } from '@nestjs/common';
import { Logger } from '@nestjs/common/services/logger.service';
import { Client, ClientKafka, Transport } from '@nestjs/microservices';
import { PartitionerArgs } from 'kafkajs';

import { SumDto } from './dtos/sum.dto';

/**
 * The following function explicity sends messages to the key representing the partition.
 */
const explicitPartitioner = () => {
  return ({
    message
  }: PartitionerArgs) => {
    return parseFloat(message.headers.toPartition.toString());
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
      run: {
        partitionsConsumedConcurrently: 3
      },
      producer: {
        createPartitioner: explicitPartitioner
      }
    },
  })
  public readonly client: ClientKafka;

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
  public mathSumSyncNumberWait(@Body() data: SumDto): Observable<string> {
    return this.client
      .send('math.sum.sync.number.wait', {
        headers: {
          toPartition: data.key.toString(),
        },
        key: data.key.toString(),
        value: data.numbers
      });
  }
}
