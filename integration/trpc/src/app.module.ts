import { Module } from '@nestjs/common';
import { TrpcModule } from '@nestjs/trpc';
import { DenyGuard, GlobalGuard, RequestScopedUsersContextService, UsersRouter } from './users/users.router';

@Module({
  imports: [
    TrpcModule.forRoot({
      path: '/trpc',
      createContext: ({ req }) => ({
        globalAuth: req.headers?.['x-global-auth'] === '1',
      }),
    }),
  ],
  providers: [
    UsersRouter,
    DenyGuard,
    GlobalGuard,
    RequestScopedUsersContextService,
  ],
})
export class AppModule {}
