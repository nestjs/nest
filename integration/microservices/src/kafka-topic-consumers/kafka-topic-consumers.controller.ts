import {
  Controller,
  HttpCode,
  OnModuleDestroy,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { Client, ClientKafka, Transport } from '@nestjs/microservices';

@Controller()
export class KafkaTopicConsumersController
  implements OnModuleInit, OnModuleDestroy
{
  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
    },
  })
  private readonly client: ClientKafka;

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  @Post('emit-a')
  @HttpCode(200)
  emitA() {
    return this.client.emit('topic-consumers.topic-a', {});
  }

  @Post('emit-b')
  @HttpCode(200)
  emitB() {
    return this.client.emit('topic-consumers.topic-b', {});
  }
}
