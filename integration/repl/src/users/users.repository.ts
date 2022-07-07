import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersRepository {
  async find() {
    return [{ id: 1, email: 'test@nestjs.com' }];
  }
}
