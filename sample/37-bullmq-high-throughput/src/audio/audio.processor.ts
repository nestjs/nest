import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

// Concurrency is a critical setting for high throughput.
// Node.js is single-threaded, so CPU-intensive tasks should use separate processes (sandboxed processors).
// However, for I/O-intensive tasks (like API calls or DB writes), a high concurrency number in the same process works well.
@Processor('audio', {
  concurrency: 50, // Process 50 jobs concurrently within this worker
  // For truly CPU-bound high-throughput, you'd use a sandboxed processor path instead:
  // useWorkerThreads: true,
})
export class AudioProcessor extends WorkerHost {
  private readonly logger = new Logger(AudioProcessor.name);

  // The process method is required when extending WorkerHost route
  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'transcode':
        return this.handleTranscode(job);
      case 'transcode-bulk':
        return this.handleTranscodeBulk(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleTranscode(job: Job) {
    this.logger.debug(`Start transcoding audio single job ${job.id}...`);
    // Simulated I/O wait representing external transcoding service
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.logger.debug(`Transcoding completed for job ${job.id}`);
  }

  private async handleTranscodeBulk(job: Job) {
    // In bulk high throughput, you usually want to reduce log noise
    // to prevent the logger from becoming the bottleneck
    if (parseInt(job.id, 10) % 100 === 0) {
      this.logger.log(`Bulk processing checkpoint: reached job ${job.id}...`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10)); // Faster simulation
  }
}
