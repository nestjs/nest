import { INestApplication } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TasksService } from '../../src/tasks/tasks.service';

describe('Scheduling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should resolve TasksService from the application context', () => {
    const tasksService = app.get(TasksService);
    expect(tasksService).toBeDefined();
  });

  it('should register cron jobs via SchedulerRegistry', () => {
    const schedulerRegistry = app.get(SchedulerRegistry);
    const cronJobs = schedulerRegistry.getCronJobs();
    expect(cronJobs.size).toBeGreaterThan(0);
  });

  it('should register intervals via SchedulerRegistry', () => {
    const schedulerRegistry = app.get(SchedulerRegistry);
    const intervals = schedulerRegistry.getIntervals();
    expect(intervals.length).toBeGreaterThan(0);
  });

  it('should register timeouts via SchedulerRegistry', () => {
    const schedulerRegistry = app.get(SchedulerRegistry);
    const timeouts = schedulerRegistry.getTimeouts();
    expect(timeouts.length).toBeGreaterThan(0);
  });
});
