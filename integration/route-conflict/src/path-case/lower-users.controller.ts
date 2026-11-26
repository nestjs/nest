import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class LowerUsersController {
  @Get()
  lower() {
    return { handler: 'lower' };
  }
}
