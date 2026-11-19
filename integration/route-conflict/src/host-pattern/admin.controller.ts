import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'users', host: 'admin.example.com' })
export class AdminController {
  @Get()
  findAll() {
    return { from: 'admin' };
  }
}
