import { Controller, Get } from '@nestjs/common';

@Controller('Users')
export class LowerIdController {
  @Get(':id([a-z]+)')
  byLowerId() {
    return { handler: 'lower' };
  }
}
