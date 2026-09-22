import {
  Body,
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  MessageEvent,
  Post,
  Put,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { DenyGuard } from './deny.guard.js';

@Controller()
export class AppController {
  @Get('items')
  findAll() {
    return { items: [] };
  }

  @Post('items')
  create(@Body() body: Record<string, unknown>) {
    return { created: true, body };
  }

  @Put('items')
  replace() {
    return { replaced: true };
  }

  @Post('webhooks/stripe')
  webhook() {
    return { received: true };
  }

  @Post('guarded')
  @UseGuards(DenyGuard)
  guarded() {
    return { guarded: true };
  }

  @Get('embeddable')
  @Header('X-Frame-Options', 'DENY')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  embeddable() {
    return { embeddable: true };
  }

  @Get('error')
  error() {
    throw new InternalServerErrorException();
  }

  @Sse('events')
  events(): Observable<MessageEvent> {
    return of({ data: 'hello' });
  }
}
