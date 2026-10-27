import { Controller, Get } from '@nestjs/common';

@Controller({ host: ['a.example.com', 'a.example.com'] })
export class RepeatedHostController {
  @Get('users/me')
  me() {
    return { from: 'repeated' };
  }
}
