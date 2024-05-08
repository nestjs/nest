import { UserEntity } from '../entities/user.entity';

export class BusinessDto {
  name: string;
  phone: string;
  user: UserEntity;
}
