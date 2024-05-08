import {
  Body,
  Controller,
  HttpCode,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Post,
} from '@nestjs/common';
import { Client, ClientRdKafka, Transport } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { BusinessDto } from './dtos/business.dto';
import { UserDto } from './dtos/user.dto';

@Controller()
export class RdKafkaController implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(RdKafkaController.name);
  static IS_NOTIFIED = false;
  static IS_NOTIFIED_WITH_KEY = false;
  static IS_NOTIFIED_WITH_KEY_AND_HEADERS = false;
  static IS_NOTIFIED_WITH_KEY_AND_MANY_HEADERS = false;

  static MATH_SUM = 0;

  @Client({
    transport: Transport.RD_KAFKA,
    options: {
      client: {
        'metadata.broker.list': 'localhost:9092',
      },
    },
  })
  private readonly client: ClientRdKafka;

  async onModuleInit() {
    const requestPatterns = [
      'math.sum.sync.kafka.message',
      'math.sum.sync.without.key',
      'math.sum.sync.plain.object',
      'math.sum.sync.array',
      'math.sum.sync.string',
      'math.sum.sync.number',
      'user.create',
      'business.create',
    ];

    requestPatterns.forEach(pattern => {
      // this.client.subscribeToResponseOf(pattern);
    });

    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.close();
  }

  // async notify
  @Post('notify')
  async sendNotification(): Promise<any> {
    return this.client.emit('notify', { notify: true });
  }

  // async notify with key
  @Post('notifyWithKey')
  async sendNotificationWithKey(): Promise<any> {
    return this.client.emit('notify.with.key', { 
      key: 'unique-key',
      value: {
        notify: true
      }
    });
  }

  // async notify with key and headers
  @Post('notifyWithKeyAndHeaders')
  async sendNotificationWithKeyAndHeaders(): Promise<any> {
    return this.client.emit('notify.with.key.and.headers', { 
      key: 'unique-key-with-header',
      headers: {
        'custom': 'something'
      },
      value: {
        notify: true
      }
    });
  }

  // async notify with key and headers
  @Post('notifyWithKeyAndManyHeaders')
  async sendNotificationWithKeyAndManyHeaders(): Promise<any> {
    return this.client.emit('notify.with.key.and.many.headers', { 
      key: 'unique-key-with-many-headers',
      headers: {
        'custom': 'something',
        'custom2': 'something2',
        'int': 123
      },
      value: {
        notify: true
      }
    });
  }

  // sync send kafka message
  @Post('mathSumSyncKafkaMessage')
  @HttpCode(200)
  async mathSumSyncKafkaMessage(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.kafka.message', {
        key: '1',
        value: {
          numbers: data,
        },
      }),
    );
    return result;
  }

  // sync send kafka(ish) message without key and only the value
  @Post('mathSumSyncWithoutKey')
  @HttpCode(200)
  async mathSumSyncWithoutKey(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.without.key', {
        value: {
          numbers: data,
        },
      }),
    );
    return result;
  }

  // sync send message without key or value
  @Post('mathSumSyncPlainObject')
  @HttpCode(200)
  async mathSumSyncPlainObject(
    @Body() data: number[],
  ): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.plain.object', {
        numbers: data,
      }),
    );
    return result;
  }

  // sync send message without key or value
  @Post('mathSumSyncArray')
  @HttpCode(200)
  async mathSumSyncArray(@Body() data: number[]): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.array', data),
    );
    return result;
  }

  @Post('mathSumSyncString')
  @HttpCode(200)
  async mathSumSyncString(@Body() data: number[]): Promise<Observable<any>> {
    // this.logger.error(util.format('mathSumSyncString() data: %o', data));
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.string', data.toString()),
    );
    return result;
  }

  @Post('mathSumSyncNumber')
  @HttpCode(200)
  async mathSumSyncNumber(@Body() data: number[]): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('math.sum.sync.number', data[0]),
    );
    return result;
  }

  // Complex data to send.
  @Post('/user')
  @HttpCode(200)
  async createUser(@Body() user: UserDto): Promise<Observable<any>> {
    const result = await lastValueFrom(
      this.client.send('user.create', {
        key: '1',
        value: {
          user,
        },
      }),
    );
    return result;
  }

  // Complex data to send.
  @Post('/business')
  @HttpCode(200)
  async createBusiness(@Body() business: BusinessDto) {
    const result = await lastValueFrom(
      this.client.send('business.create', {
        key: '1',
        value: {
          business,
        },
      }),
    );
    return result;
  }
}
