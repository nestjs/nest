import { Module } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';
import { EagerModule } from './eager.module';
import { GlobalModule } from './global.module';
import { LazyModule } from './lazy.module';

@Module({
  imports: [GlobalModule, EagerModule],
})
export class AppModule {
  constructor(public loader: LazyModuleLoader) {}

  async onApplicationBootstrap() {
    await this.loader.load(() => LazyModule);
  }
}
