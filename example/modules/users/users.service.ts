import { Component } from './../../../src/';
import { HttpException } from '../../../src/core/exceptions/http-exception';

@Component()
export class UsersService {
    private users = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Alice Caeiro' },
        { id: 3, name: 'Who Knows' },
    ];

    public getUsers() {
        return this.users;
    }

    public getAllUsers() {
        return Promise.resolve(this.users);
    }

    public getUser(id: string) {
        const user = this.users.find((user) => user.id === +id);
        if (!user) {
            throw new HttpException('User not found', 404);
        }
        return Promise.resolve(user);
    }

    public addUser(user) {
        this.users.push(user);
        return Promise.resolve();
    }
}