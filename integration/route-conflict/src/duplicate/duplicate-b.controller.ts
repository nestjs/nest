import { Controller, Get } from '@nestjs/common';

@Controller()
export class DuplicateBController {
  @Get('users/me')
  me() {
    return { from: 'B' };
  }
}
