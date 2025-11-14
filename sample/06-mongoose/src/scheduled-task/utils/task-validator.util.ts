import { CreateScheduledTaskDto } from '../dto';
import { FrequencyEnum } from '../enums/frequency.enum';

/**
 * 定时任务验证工具类
 * 负责验证定时任务数据的有效性
 * @class TaskValidator
 */
export class TaskValidator {
  /**
   * 验证启用任务时的必填字段
   * @param {CreateScheduledTaskDto} taskData - 定时任务数据
   * @throws {Error} 如果验证失败则抛出错误
   */
  static validateEnableTask(taskData: CreateScheduledTaskDto): void {
    // 验证基本必填字段
    if (!taskData.frequency || !taskData.time || !taskData.recipient || !taskData.pageIds || !taskData.branchIds) {
      throw new Error('enable: true 时，frequency、time、recipient、pageIds、branchIds 都是必填字段');
    }

    // 验证 time 对象中的必填字段
    if (!taskData.time.time) {
      throw new Error('time.time 字段是必填的');
    }

    // 根据 frequency 验证特定字段
    if (taskData.frequency === FrequencyEnum.WEEKLY && !taskData.time.week) {
      throw new Error('weekly 频率需要提供 time.week 字段');
    }
    if (taskData.frequency === FrequencyEnum.MONTHLY && !taskData.time.day) {
      throw new Error('monthly 频率需要提供 time.day 字段');
    }
  }
}

