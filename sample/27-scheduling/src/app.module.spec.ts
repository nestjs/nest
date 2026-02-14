import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { TasksService } from './tasks/tasks.service';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide TasksService', () => {
    const tasksService = module.get<TasksService>(TasksService);
    expect(tasksService).toBeDefined();
    expect(tasksService).toBeInstanceOf(TasksService);
  });
});
