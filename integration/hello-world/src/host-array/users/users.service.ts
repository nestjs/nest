import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  findById(id: string) {
    return { id, host: true };
  }
}
