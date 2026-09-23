import { Injectable } from '@nestjs/common';
import { IdGenerator } from '../id-generator/id-generator.js';

export interface User {
  id: string;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  constructor(private readonly idGenerator: IdGenerator) {}

  create(name: string): User {
    const user = { id: this.idGenerator.generate(), name };
    this.users.push(user);
    return user;
  }

  findAll(): User[] {
    return this.users;
  }
}
