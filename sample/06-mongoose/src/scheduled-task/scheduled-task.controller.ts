import { Get, Put, Body, Controller } from '@nestjs/common';
import { ScheduledTaskService } from './scheduled-task.service';
import { CreateScheduledTaskDto } from './dto';
import { ScheduledTask } from './scheduled-task.interface';

/**
 * 定时任务控制器
 * 处理定时任务相关的 HTTP 请求
 * @class ScheduledTaskController
 */
@Controller('scheduled-tasks')
export class ScheduledTaskController {
  /**
   * 构造函数，注入定时任务服务
   * @param {ScheduledTaskService} scheduledTaskService - 定时任务服务实例
   */
  constructor(private readonly scheduledTaskService: ScheduledTaskService) {}

  /**
   * 获取所有定时任务列表
   * @route GET /scheduled-tasks
   * @returns {Promise<{tasks: ScheduledTask[], tasksCount: number}>} 返回任务列表和总数
   */
  @Get()
  async findAll(): Promise<{ tasks: ScheduledTask[]; tasksCount: number }> {
    const tasks = await this.scheduledTaskService.findAll();
    return {
      tasks,
      tasksCount: tasks.length,
    };
  }

  /**
   * 创建或更新定时任务
   * 使用固定的系统任务ID（security-operations-report-system）
   * enable: false 时，只需要传 enable 字段，其他字段可选
   * enable: true 时，frequency、time、recipient、pageIds、branchIds 都是必填字段
   * @route PUT /scheduled-tasks
   * @param {CreateScheduledTaskDto} taskData - 定时任务数据（不需要传入 id）
   * @returns {Promise<ScheduledTask>} 返回创建或更新后的任务对象
   */
  @Put()
  async createOrUpdate(@Body() taskData: CreateScheduledTaskDto): Promise<ScheduledTask> {
    return await this.scheduledTaskService.createOrUpdate(taskData);
  }
}
