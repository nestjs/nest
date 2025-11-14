import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateScheduledTaskDto } from './dto';
import { ScheduledTask, ScheduledTaskDocument } from './schemas/scheduled-task.schema';
import { TaskValidator } from './utils/task-validator.util';
import { TaskUpdater } from './utils/task-updater.util';

/**
 * 定时任务服务类
 * 负责定时任务的业务逻辑处理，包括创建、更新、查询等操作
 * @class ScheduledTaskService
 */
@Injectable()
export class ScheduledTaskService {
  /**
   * 系统固定的任务ID
   * @private
   * @type {string}
   */
  private readonly SYSTEM_TASK_ID = 'security-operations-report-system';

  /**
   * 构造函数，注入 Mongoose Model
   * @param {Model<ScheduledTaskDocument>} taskModel - 定时任务 Mongoose Model
   */
  constructor(
    @InjectModel(ScheduledTask.name)
    private taskModel: Model<ScheduledTaskDocument>,
  ) {}

  /**
   * 获取所有定时任务列表
   * 按创建时间倒序排列
   * @returns {Promise<ScheduledTask[]>} 返回所有定时任务数组
   */
  async findAll(): Promise<ScheduledTask[]> {
    return await this.taskModel
      .find()
      .sort({ created: -1 })
      .exec();
  }

  /**
   * 创建或更新定时任务
   * 使用固定的系统任务ID，如果任务已存在则更新，不存在则创建新任务
   * 当 enable: false 时，只更新 enable 字段，其他字段保持不变
   * 当 enable: true 时，cronExpression 会根据 frequency 和 time 自动生成
   * @param {CreateScheduledTaskDto} taskData - 定时任务数据
   * @returns {Promise<ScheduledTask>} 返回创建或更新后的任务对象
   */
  async createOrUpdate(taskData: CreateScheduledTaskDto): Promise<ScheduledTask> {
    const taskId = this.SYSTEM_TASK_ID;

    // 如果是关闭操作（enable: false），只更新 enable 字段
    if (!taskData.enable) {
      return await TaskUpdater.disableTask(this.taskModel, taskId);
    }

    // enable: true 时，验证必填字段
    TaskValidator.validateEnableTask(taskData);

    // 启用或更新任务
    return await TaskUpdater.enableOrUpdateTask(this.taskModel, taskId, taskData);
  }
}
