import { Module } from '@nestjs/common';
import { TrpcModule } from '@nestjs/trpc';
import { UsersRouter } from './users/users.router';

@Module({
    imports: [
        TrpcModule.forRoot({
            path: '/trpc',
        }),
    ],
    providers: [UsersRouter],
})
export class AppModule { }
