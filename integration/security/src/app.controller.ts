import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
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
}
