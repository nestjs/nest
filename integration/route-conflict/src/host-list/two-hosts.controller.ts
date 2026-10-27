import { Controller, Get } from '@nestjs/common';

@Controller({ host: ['a.example.com', 'b.example.com'] })
export class TwoHostsController {
  @Get('users/me')
  me() {
    return { from: 'two-hosts' };
  }
}
