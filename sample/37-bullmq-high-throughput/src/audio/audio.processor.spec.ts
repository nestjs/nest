import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { AudioProcessor } from './audio.processor';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;
  let loggerSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioProcessor],
    }).compile();

    audioProcessor = module.get<AudioProcessor>(AudioProcessor);
    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should call handleTranscode when job name is transcode', async () => {
      const mockJob = {
        name: 'transcode',
        id: '1',
        data: { file: 'test.mp3' },
      } as Job;

      await audioProcessor.process(mockJob);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Start transcoding audio single job 1...',
      );
    });

    it('should call handleTranscodeBulk when job name is transcode-bulk', async () => {
      const mockJob = {
        name: 'transcode-bulk',
        id: '100',
        data: { file: 'audio_100.mp3' },
      } as Job;

      await audioProcessor.process(mockJob);

      expect(logSpy).toHaveBeenCalledWith(
        'Bulk processing checkpoint: reached job 100...',
      );
    });

    it('should log warning for unknown job names', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const mockJob = {
        name: 'unknown',
        id: '1',
        data: {},
      } as Job;

      await audioProcessor.process(mockJob);

      expect(warnSpy).toHaveBeenCalledWith('Unknown job name: unknown');
    });
  });
});
