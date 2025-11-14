import { Model } from 'mongoose';
import { CreateScheduledTaskDto } from '../dto';
import { ScheduledTask, ScheduledTaskDocument } from '../schemas/scheduled-task.schema';
import { FrequencyEnum } from '../enums/frequency.enum';
import { CronGenerator } from './cron-generator.util';

/**
 * 定时任务更新工具类
 * 负责处理任务的创建和更新操作
 * @class TaskUpdater
 */
export class TaskUpdater {
  /**
   * 更新任务的启用状态为禁用
   * @param {Model<ScheduledTaskDocument>} taskModel - Mongoose Model
   * @param {string} taskId - 任务ID
   * @returns {Promise<ScheduledTask>} 返回更新后的任务对象
   */
  static async disableTask(
    taskModel: Model<ScheduledTaskDocument>,
    taskId: string
  ): Promise<ScheduledTask> {
    const existingTask = await taskModel.findOne({ id: taskId }).exec();

    if (existingTask) {
      // 使用 findOneAndUpdate 更新 enable 字段
      const updatedTask = await taskModel
        .findOneAndUpdate(
          { id: taskId },
          {
            $set: {
              enable: false,
              updated: new Date()
            }
          },
          { new: true } // 返回更新后的文档
        )
        .exec();
      
      if (!updatedTask) {
        throw new Error(`任务 ${taskId} 更新失败`);
      }
      
      return updatedTask;
    } else {
      // 如果任务不存在，创建一个禁用的任务（使用默认值）
      const newTask = new taskModel({
        id: taskId,
        enable: false,
        frequency: FrequencyEnum.DAILY,
        time: { time: '00:00' },
        recipient: [],
        pageIds: [],
        branchIds: [],
        cronExpression: '0 0 0 * * *',
        created: new Date(),
        updated: new Date(),
      });
      return await newTask.save();
    }
  }

  /**
   * 启用或更新任务
   * @param {Model<ScheduledTaskDocument>} taskModel - Mongoose Model
   * @param {string} taskId - 任务ID
   * @param {CreateScheduledTaskDto} taskData - 定时任务数据
   * @returns {Promise<ScheduledTask>} 返回创建或更新后的任务对象
   */
  static async enableOrUpdateTask(
    taskModel: Model<ScheduledTaskDocument>,
    taskId: string,
    taskData: CreateScheduledTaskDto
  ): Promise<ScheduledTask> {
    // 生成 cron 表达式
    const cronExpression = CronGenerator.generate(taskData.frequency!, taskData.time!);

    const existingTask = await taskModel.findOne({ id: taskId }).exec();

    if (existingTask) {
      // 使用 findOneAndUpdate 更新现有任务
      const updatedTask = await taskModel
        .findOneAndUpdate(
          { id: taskId },
          {
            $set: {
              enable: true,
              frequency: taskData.frequency!,
              time: taskData.time!,
              recipient: taskData.recipient!,
              pageIds: taskData.pageIds!,
              branchIds: taskData.branchIds!,
              cronExpression,
              updated: new Date(),
            }
          },
          { new: true } // 返回更新后的文档
        )
        .exec();
      
      if (!updatedTask) {
        throw new Error(`任务 ${taskId} 更新失败`);
      }
      
      return updatedTask;
    } else {
      // 创建新任务
      const newTask = new taskModel({
        id: taskId,
        enable: true,
        frequency: taskData.frequency!,
        time: taskData.time!,
        recipient: taskData.recipient!,
        pageIds: taskData.pageIds!,
        branchIds: taskData.branchIds!,
        cronExpression,
        created: new Date(),
        updated: new Date(),
      });
      return await newTask.save();
    }
  }
}

