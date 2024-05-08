import { UserDto } from '../dtos/user.dto';

export class UserEntity {
  constructor(user: UserDto) {
    this.id = Math.random() * 99999999;
    this.name = user.name;
    this.email = user.email;
    this.phone = user.phone;
    this.years = user.years;
    this.created = new Date();
  }
  id: number;
  name: string;
  email: string;
  phone: string;
  years: number;
  created: Date;
}
