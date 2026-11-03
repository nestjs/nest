import { Controller, Get, Param } from '@nestjs/common';

@Controller()
export class OptionalGroupController {
  @Get('users{/:userId}')
  find(@Param('userId') userId?: string) {
    return { handler: 'find', userId };
  }

  @Get('users/:userId')
  byId(@Param('userId') userId: string) {
    return { handler: 'byId', userId };
  }
}
