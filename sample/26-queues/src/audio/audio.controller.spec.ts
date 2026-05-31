import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bull';
import { AudioController } from './audio.controller';

describe('AudioController', () => {
  let audioController: AudioController;
  let audioQueue: Queue;

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AudioController],
      providers: [
        {
          provide: getQueueToken('audio'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    audioController = module.get<AudioController>(AudioController);
    audioQueue = module.get<Queue>(getQueueToken('audio'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transcode', () => {
    it('should be defined', () => {
      expect(audioController.transcode).toBeDefined();
    });

    it('should add transcode job to the queue', async () => {
      await audioController.transcode();

      expect(mockQueue.add).toHaveBeenCalledWith('transcode', {
        file: 'audio.mp3',
      });
    });

    it('should call queue.add exactly once', async () => {
      await audioController.transcode();

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
    });

    it('should add job with correct job name', async () => {
      await audioController.transcode();

      const callArgs = mockQueue.add.mock.calls[0];
      expect(callArgs[0]).toBe('transcode');
    });

    it('should add job with correct data structure', async () => {
      await audioController.transcode();

      const callArgs = mockQueue.add.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('file');
      expect(callArgs[1].file).toBe('audio.mp3');
    });

    it('should handle multiple calls independently', async () => {
      await audioController.transcode();
      await audioController.transcode();
      await audioController.transcode();

      expect(mockQueue.add).toHaveBeenCalledTimes(3);
    });
  });
});
