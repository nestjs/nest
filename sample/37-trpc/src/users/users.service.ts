import { Injectable } from '@nestjs/common';
import { User, CreateUserInput } from './users.schema';

@Injectable()
export class UsersService {
  private users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', role: 'moderator' },
  ];
  private nextId = 4;

  findAll(): User[] {
    return [...this.users];
  }

  findById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  search(query: string): User[] {
    const q = query.toLowerCase();
    return this.users.filter(
      u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }

  create(input: CreateUserInput): User {
    const { role, ...rest } = input;
    const user: User = {
      id: this.nextId++,
      ...rest,
      role: role ?? 'user',
    };
    this.users.push(user);
    return user;
  }

  remove(id: number): User | undefined {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    return this.users.splice(index, 1)[0];
  }
}
