import { Controller, Get, Param } from '@nestjs/common';

@Controller('accounts')
export class AccountsController {
  @Get(':id')
  byId(@Param('id') id: string) {
    return { handler: 'byId', id };
  }

  @Get(':username')
  byUsername(@Param('username') username: string) {
    return { handler: 'byUsername', username };
  }
}
