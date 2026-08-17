import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from '../../src/app.module.js';
import { TasksService } from '../../src/tasks/tasks.service.js';

describe('TasksService (e2e)', () => {
  let app: INestApplication;
  let module: TestingModule;
  let schedulerRegistry: SchedulerRegistry;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    schedulerRegistry = module.get(SchedulerRegistry);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should have TasksService registered', () => {
    const tasksService = module.get(TasksService);
    expect(tasksService).toBeDefined();
  });

  it('should register a cron job', () => {
    const cronJobs = schedulerRegistry.getCronJobs();
    expect(cronJobs.size).toBeGreaterThanOrEqual(1);
  });

  it('should register an interval', () => {
    const intervals = schedulerRegistry.getIntervals();
    expect(intervals.length).toBeGreaterThanOrEqual(1);
  });

  it('should register a timeout', () => {
    const timeouts = schedulerRegistry.getTimeouts();
    expect(timeouts.length).toBeGreaterThanOrEqual(1);
  });
});
