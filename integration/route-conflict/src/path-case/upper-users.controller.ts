import { Controller, Get } from '@nestjs/common';

@Controller('Users')
export class UpperUsersController {
  @Get()
  upper() {
    return { handler: 'upper' };
  }
}
