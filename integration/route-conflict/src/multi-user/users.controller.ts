import { Controller, Get, Param } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get(':userId')
  byId(@Param('userId') userId: string) {
    return { handler: 'byId', userId };
  }

  @Get('me')
  me() {
    return { handler: 'me' };
  }
}
