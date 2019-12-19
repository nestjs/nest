import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioModule } from './audio/audio.module';

@Module({
  imports: [AudioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
