import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UpperIdController {
  @Get(':id([A-Z]+)')
  byUpperId() {
    return { handler: 'upper' };
  }
}
