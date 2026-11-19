import { Controller, Get } from '@nestjs/common';

@Controller({ path: 'users', host: ':tenant.example.com' })
export class TenantController {
  @Get()
  findAll() {
    return { from: 'tenant' };
  }
}
