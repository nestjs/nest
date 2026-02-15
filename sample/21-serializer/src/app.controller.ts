import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import { RoleEntity } from './entities/role.entity.js';
import { UserEntity } from './entities/user.entity.js';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class AppController {
  @Get()
  findOne(): UserEntity {
    return new UserEntity({
      id: 1,
      firstName: 'Kamil',
      lastName: 'Mysliwiec',
      password: 'password',
      role: new RoleEntity({ id: 1, name: 'admin' }),
    });
  }
}
