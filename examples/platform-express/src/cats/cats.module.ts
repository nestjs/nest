import { Module } from '@nest/core';
import { ServerModule } from '@nest/server';

import { CatsController } from './cats.controller';
import { CatsConfigure } from './cats.configure';

@Module({
  imports: [
    ServerModule.forFeature([CatsController], {
      configure: CatsConfigure,
    }),
  ],
})
export class CatsModule {}
