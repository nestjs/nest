import { Module } from '@nestjs/common';
import { AModule } from './a.module';
import { BModule } from './b.module';
import { CModule } from './c.module';

@Module({
  imports: [AModule, BModule, CModule],
})
export class MultipleProvidersModule {}
