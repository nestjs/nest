import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AudioController } from './audio/audio.controller.js';
import { AudioProcessor } from './audio/audio.processor.js';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'audio',
    }),
  ],
  controllers: [AudioController],
  providers: [AudioProcessor],
})
export class AppModule {}
