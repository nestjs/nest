import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { Logger } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService],
    }).compile();

    service = module.get<TasksService>(TasksService);
    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should call logger.debug with cron message', () => {
      service.handleCron();
      expect(loggerSpy).toHaveBeenCalledWith('Called when the second is 45');
    });
  });

  describe('handleInterval', () => {
    it('should call logger.debug with interval message', () => {
      service.handleInterval();
      expect(loggerSpy).toHaveBeenCalledWith('Called every 10 seconds');
    });
  });

  describe('handleTimeout', () => {
    it('should call logger.debug with timeout message', () => {
      service.handleTimeout();
      expect(loggerSpy).toHaveBeenCalledWith('Called once after 5 seconds');
    });
  });
});
