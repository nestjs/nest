import { WeekEnum } from './enums/week.enum';
import { FrequencyEnum } from './enums/frequency.enum';

/**
 * 定时任务接口定义
 * @interface ScheduledTask
 */
export interface ScheduledTask {
  /** 任务唯一标识符 */
  id: string;

  /** 是否启用 */
  enable: boolean;

  /** 执行频率枚举 */
  frequency: FrequencyEnum;

  /** 执行时间配置 */
  time: {
    /** 具体时间（格式：HH:mm） */
    time: string;
    /** 星期几（可选，weekly 频率时必填） */
    week?: WeekEnum;
    /** 日期（可选，范围：1-31，monthly 频率时必填） */
    day?: number;
  };

  /** 接收人邮箱列表 */
  recipient: string[];

  /** 页面ID列表 */
  pageIds: string[];

  /** 分支ID列表 */
  branchIds: string[];

  /** Cron 表达式 */
  cronExpression: string;

  /** 创建时间 */
  created: Date;

  /** 更新时间 */
  updated: Date;
}

