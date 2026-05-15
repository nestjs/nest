import { UserEntity } from '../entities/user.entity.js';

export class BusinessDto {
  name: string;
  phone: string;
  user: UserEntity;
}
