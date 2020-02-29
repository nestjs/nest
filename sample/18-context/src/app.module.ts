import { Module } from '@nestjs/common';
import { AppService } from './app.service';

@Module({
  providers: [AppService],
})
export class AppModule {}
