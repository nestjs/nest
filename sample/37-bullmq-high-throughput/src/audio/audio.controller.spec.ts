import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { AudioController } from './audio.controller';

describe('AudioController', () => {
  let audioController: AudioController;

  const mockQueue = {
    add: jest.fn(),
    addBulk: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transcode', () => {
    it('should be defined', () => {
      expect(typeof audioController.transcode).toBe('function');
    });

    it('should add transcode job to the queue', async () => {
      await audioController.transcode();

      expect(mockQueue.add).toHaveBeenCalledWith('transcode', {
        file: 'audio.mp3',
      });
    });
  });

  describe('transcodeBulk', () => {
    it('should be defined', () => {
      expect(typeof audioController.transcodeBulk).toBe('function');
    });

    it('should add 1000 jobs in bulk to the queue', async () => {
      const result = await audioController.transcodeBulk();

      expect(result.jobsQueued).toBe(1000);
      expect(mockQueue.addBulk).toHaveBeenCalledTimes(1);

      const bulkJobs = mockQueue.addBulk.mock.calls[0][0] as any[];
      expect(bulkJobs).toHaveLength(1000);
      expect(bulkJobs[0]).toMatchObject({
        name: 'transcode-bulk',
        data: { file: 'audio_0.mp3' },
      });
    });
  });
});
