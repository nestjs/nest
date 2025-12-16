import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { AudioProcessor } from './audio.processor';

describe('AudioProcessor', () => {
  let audioProcessor: AudioProcessor;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioProcessor],
    }).compile();

    audioProcessor = module.get<AudioProcessor>(AudioProcessor);
    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTranscode', () => {
    it('should be defined', () => {
      expect(audioProcessor.handleTranscode).toBeDefined();
    });

    it('should process transcode job and log messages', () => {
      const mockJob = {
        data: { file: 'test-audio.mp3' },
      } as Job;

      audioProcessor.handleTranscode(mockJob);

      expect(loggerSpy).toHaveBeenCalledWith('Start transcoding...');
      expect(loggerSpy).toHaveBeenCalledWith(mockJob.data);
      expect(loggerSpy).toHaveBeenCalledWith('Transcoding completed');
    });

    it('should log exactly 3 times per job', () => {
      const mockJob = {
        data: { file: 'audio.mp3' },
      } as Job;

      audioProcessor.handleTranscode(mockJob);

      expect(loggerSpy).toHaveBeenCalledTimes(3);
    });

    it('should log start message first', () => {
      const mockJob = {
        data: { file: 'audio.mp3' },
      } as Job;

      audioProcessor.handleTranscode(mockJob);

      expect(loggerSpy).toHaveBeenNthCalledWith(1, 'Start transcoding...');
    });

    it('should log job data in the middle', () => {
      const mockJob = {
        data: { file: 'custom.mp3' },
      } as Job;

      audioProcessor.handleTranscode(mockJob);

      expect(loggerSpy).toHaveBeenNthCalledWith(2, { file: 'custom.mp3' });
    });

    it('should log completion message last', () => {
      const mockJob = {
        data: { file: 'audio.mp3' },
      } as Job;

      audioProcessor.handleTranscode(mockJob);

      expect(loggerSpy).toHaveBeenNthCalledWith(3, 'Transcoding completed');
    });

    it('should handle different file names', () => {
      const mockJob1 = { data: { file: 'song1.mp3' } } as Job;
      const mockJob2 = { data: { file: 'song2.mp3' } } as Job;

      audioProcessor.handleTranscode(mockJob1);
      audioProcessor.handleTranscode(mockJob2);

      expect(loggerSpy).toHaveBeenCalledWith({ file: 'song1.mp3' });
      expect(loggerSpy).toHaveBeenCalledWith({ file: 'song2.mp3' });
    });

    it('should process multiple jobs sequentially', () => {
      const job1 = { data: { file: 'file1.mp3' } } as Job;
      const job2 = { data: { file: 'file2.mp3' } } as Job;

      audioProcessor.handleTranscode(job1);
      audioProcessor.handleTranscode(job2);

      expect(loggerSpy).toHaveBeenCalledTimes(6); // 3 calls per job
    });
  });
});
