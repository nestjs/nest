import { Router, Query, Mutation } from '@nestjs/trpc';
import { z } from 'zod';

const userSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
});

const createUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
});

@Router('users')
export class UsersRouter {
    private users = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
    ];

    @Query('list')
    list() {
        return this.users;
    }

    @Query('byId', { input: z.object({ id: z.string() }) })
    byId(input: { id: string }) {
        return this.users.find(u => u.id === input.id) ?? null;
    }

    @Mutation('create', { input: createUserSchema, output: userSchema })
    create(input: { name: string; email: string }) {
        const user = {
            id: String(this.users.length + 1),
            name: input.name,
            email: input.email,
        };
        this.users.push(user);
        return user;
    }
}
