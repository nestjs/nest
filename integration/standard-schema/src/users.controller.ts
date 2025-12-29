import { Body, Controller, Post, Query } from '@nestjs/common';
import { CreateUserDto, QueryDto } from './dto';

@Controller('users')
export class UsersController {
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return {
      success: true,
      data: createUserDto,
    };
  }

  @Post('query')
  withQuery(@Query() query: QueryDto, @Body() body: CreateUserDto) {
    return {
      success: true,
      query,
      body,
    };
  }
}
