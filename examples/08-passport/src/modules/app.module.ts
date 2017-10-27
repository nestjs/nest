import { Module } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';

@Module({
  modules: [AuthModule],
})
export class ApplicationModule {}
