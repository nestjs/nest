import {
  Body,
  Controller,
  OnModuleDestroy,
  OnModuleInit,
  Post,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { Logger } from '@nestjs/common/services/logger.service';
import { Client, ClientKafka, Transport } from '@nestjs/microservices';

@Controller()
export class KafkaMultipleController implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(KafkaMultipleController.name);

  @Client({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
      },
    },
  })
  public readonly client: ClientKafka;

  async onModuleInit() {
    const requestPatterns = ['math.plus.one'];

    requestPatterns.forEach(pattern => {
      this.client.subscribeToResponseOf(pattern);
    });
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  @HttpCode(200)
  @Post('mathPlusOne')
  public mathPlusOne(@Body() data: any, @Res() res: Response): void {
    const result = [];
    this.client
      .sendToMultiple('math.plus.one', {
        value: data.value,
      })
      .subscribe(
        val => result.push(Number.parseInt(val)),
        null,
        () => res.send(result),
      );
  }
}
