import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { AudioModule } from './audio/audio.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    AudioModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
