import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';

@Module({
  providers: [TasksService],
})
export class TasksModule {}
