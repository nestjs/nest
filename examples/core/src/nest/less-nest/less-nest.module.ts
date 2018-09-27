import { Module } from '@nest/core';

import { LessNestService } from './less-nest.service';

@Module({
  providers: [LessNestService],
  exports: [LessNestService],
})
export class LessNestModule {}
