import { Controller, Get } from '@nestjs/common';

@Controller('Orders')
export class UpperOrdersController {
  @Get('pending')
  pending() {
    return { handler: 'pending' };
  }
}
