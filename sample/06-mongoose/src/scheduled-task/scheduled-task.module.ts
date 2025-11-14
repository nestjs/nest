import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduledTaskService } from './scheduled-task.service';
import { ScheduledTaskController } from './scheduled-task.controller';
import { ScheduledTask, ScheduledTaskSchema } from './schemas/scheduled-task.schema';

/**
 * 定时任务模块
 * 管理定时任务相关的服务、控制器等
 * @class ScheduledTaskModule
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduledTask.name, schema: ScheduledTaskSchema }
    ])
  ],
  providers: [ScheduledTaskService],
  controllers: [ScheduledTaskController],
  exports: [ScheduledTaskService],
})
export class ScheduledTaskModule {}
