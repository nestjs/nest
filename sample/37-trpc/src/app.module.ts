import { Module } from '@nestjs/common';
import { TrpcModule } from '@nestjs/trpc';
import { join } from 'path';
import { CatsModule } from './cats/cats.module';
import { UsersModule } from './users/users.module';
import { HealthRouter } from './health.router';
import {
  AppTrpcContext,
  TRPC_API_KEY_HEADER,
  TRPC_PATH,
  TRPC_REQUEST_ID_HEADER,
} from './common/trpc-context';

@Module({
  imports: [
    TrpcModule.forRoot({
      path: TRPC_PATH,
      autoSchemaFile: join(process.cwd(), 'src/@generated/server.ts'),
      createContext: ({ req }): AppTrpcContext => {
        const requestId =
          req.headers[TRPC_REQUEST_ID_HEADER] ?? crypto.randomUUID();
        const rawApiKey = req.headers[TRPC_API_KEY_HEADER];
        return {
          requestId: String(requestId),
          apiKey: typeof rawApiKey === 'string' ? rawApiKey : undefined,
        };
      },
    }),
    CatsModule,
    UsersModule,
  ],
  providers: [HealthRouter],
})
export class AppModule {}
