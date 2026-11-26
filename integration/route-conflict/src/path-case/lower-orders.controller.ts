import { Controller, Get, Param } from '@nestjs/common';

@Controller('orders')
export class LowerOrdersController {
  @Get(':id')
  byId(@Param('id') id: string) {
    return { handler: 'byId', id };
  }
}
