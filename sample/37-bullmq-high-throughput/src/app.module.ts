import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AudioController } from './audio/audio.controller';
import { AudioProcessor } from './audio/audio.processor';

@Module({
  imports: [
    // Configure BullMQ to use ioredis.
    // High-throughput queues benefit from maxRetriesPerRequest: null
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null, // Critical requirement for BullMQ
      },
      // You can also define defaultJobOptions here for all queues:
      defaultJobOptions: {
        removeOnComplete: true, // Automatically clean up successful jobs to save memory
        removeOnFail: 1000, // Keep only the last 1000 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),

    // Register the "audio" queue
    BullModule.registerQueue({
      name: 'audio',
    }),
  ],
  controllers: [AudioController],
  providers: [AudioProcessor],
})
export class AppModule {}
