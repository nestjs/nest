import {
  ArgumentsHost,
  Catch,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  BaseWsExceptionFilter,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { IsString } from 'class-validator';

class TestModel {
  @IsString()
  stringProp: string;
}

@Catch()
export class AllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    throw exception;
  }
}

@WebSocketGateway(8080)
@UsePipes(new ValidationPipe())
@UseFilters(new AllExceptionsFilter())
export class ValidationPipeGateway {
  @SubscribeMessage('push')
  onPush(@MessageBody() data: TestModel) {
    console.log('received msg');
    return {
      event: 'push',
      data,
    };
  }
}
