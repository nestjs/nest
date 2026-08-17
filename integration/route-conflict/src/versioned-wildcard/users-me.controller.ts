import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'users', version: '1' })
export class UsersMeController {
  @Get('me')
  me() {
    return { handler: 'me' };
  }
}
