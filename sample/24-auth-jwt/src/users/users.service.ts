import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly users;

  constructor() {
    this.users = [
      {
        userId: 1,
        username: 'john',
        password: 'changeme',
      },
      {
        userId: 2,
        username: 'chris',
        password: 'secret',
      },
      {
        userId: 3,
        username: 'maria',
        password: 'guess',
      },
    ];
  }

  async findOne(username): Promise<any> {
    return this.users.filter(user => user.username === username)[0];
  }
}
