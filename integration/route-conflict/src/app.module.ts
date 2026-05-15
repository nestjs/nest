import { Module } from '@nestjs/common';
import { MultiUserModule } from './multi-user/multi-user.module.js';

@Module({
  imports: [MultiUserModule],
})
export class AppModule {}
