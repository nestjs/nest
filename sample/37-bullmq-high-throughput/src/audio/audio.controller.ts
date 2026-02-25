import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post } from '@nestjs/common';
import { Queue } from 'bullmq';

@Controller('audio')
export class AudioController {
  constructor(@InjectQueue('audio') private readonly audioQueue: Queue) {}

  @Post('transcode')
  async transcode() {
    // Standard single job insertion
    await this.audioQueue.add('transcode', {
      file: 'audio.mp3',
    });
    return { message: 'Transcode job added' };
  }

  @Post('transcode-bulk')
  async transcodeBulk() {
    // High-throughput bulk job insertion using addBulk
    // This is significantly faster than calling .add() in a loop
    const jobs = Array.from({ length: 1000 }).map((_, index) => ({
      name: 'transcode-bulk',
      data: {
        file: `audio_${index}.mp3`,
      },
      opts: { priority: index % 2 === 0 ? 1 : 2 }, // varying priorities
    }));

    await this.audioQueue.addBulk(jobs);

    return {
      message: '1000 transcode jobs added in bulk to the queue',
      jobsQueued: jobs.length,
    };
  }
}
