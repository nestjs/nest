import { Module } from '@nest/core';
import { ServerModule } from '@nest/server';
import { ExpressAdapter } from '@nest/platform-express';

import { CatsModule } from './cats';

@Module({
  imports: [
    ServerModule.forRoot(ExpressAdapter, {
      port: 3030,
    }),
    CatsModule,
  ],
})
export class AppModule {}
