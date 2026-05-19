import { Controller, Get } from '@nestjs/common';

@Controller()
export class DuplicateAController {
  @Get('users/me')
  me() {
    return { from: 'A' };
  }
}
