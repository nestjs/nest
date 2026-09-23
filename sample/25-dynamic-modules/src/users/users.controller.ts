import { Body, Controller, Get, Post } from '@nestjs/common';
import { User, UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body('name') name: string): User {
    return this.usersService.create(name);
  }

  @Get()
  findAll(): User[] {
    return this.usersService.findAll();
  }
}
