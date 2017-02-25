import { Component } from "./../../../src/";
import { HttpException } from '../../../src/core/exceptions/http-exception';

@Component()
export class UsersService {

    private users = [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Alice Caeiro" },
        { id: 3, name: "Who Knows" },
    ];

    getUsers() {
        return this.users;
    }

    getAllUsers() {
        return Promise.resolve(this.users);
    }

    getUser(id: string) {
        const user = this.users.find((user) => user.id === +id);
        if (!user) {
            throw new HttpException("User not found", 404);
        }
        return Promise.resolve(user);
    }

    addUser(user) {
        this.users.push(user);
        return Promise.resolve();
    }

}