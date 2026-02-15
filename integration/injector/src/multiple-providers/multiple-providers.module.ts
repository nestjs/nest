import { Module } from '@nestjs/common';
import { AModule } from './a.module.js';
import { BModule } from './b.module.js';
import { CModule } from './c.module.js';

@Module({
  imports: [AModule, BModule, CModule],
})
export class MultipleProvidersModule {}
