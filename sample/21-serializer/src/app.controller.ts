import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';

@Controller()
@UseInterceptors(ClassSerializerInterceptor)
export class AppController {
  @Get()
  @SerializeOptions({
    excludePrefixes: 'excludeAll',
  })
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
