import { Module } from '@nest/core';

import { ParamsTokenFactory } from './params-token-factory.service';

@Module({
  providers: [ParamsTokenFactory],
  exports: [],
})
export class PipesModule {}
