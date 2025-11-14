import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FrequencyEnum } from '../enums/frequency.enum';
import { WeekEnum } from '../enums/week.enum';

/**
 * 时间配置 Schema
 * @class TimeSchema
 */
@Schema({ _id: false })
export class TimeSchema {
  /** 具体时间（格式：HH:mm） */
  @Prop({ required: true, type: String })
  time: string;

  /** 星期几（weekly 频率时必填） */
  @Prop({ type: String, enum: Object.values(WeekEnum), required: false })
  week?: WeekEnum;

  /** 日期（范围：1-31，monthly 频率时必填） */
  @Prop({ type: Number, min: 1, max: 31, required: false })
  day?: number;
}

/**
 * 定时任务 Schema
 * @class ScheduledTaskDocument
 */
export type ScheduledTaskDocument = ScheduledTask & Document;

@Schema({ collection: 'scheduled_tasks', timestamps: true })
export class ScheduledTask {
  /** 任务唯一标识符 */
  @Prop({ required: true, unique: true, type: String })
  id: string;

  /** 是否启用 */
  @Prop({ required: true, type: Boolean, default: false })
  enable: boolean;

  /** 执行频率枚举 */
  @Prop({ required: true, type: String, enum: Object.values(FrequencyEnum) })
  frequency: FrequencyEnum;

  /** 执行时间配置 */
  @Prop({ required: true, type: TimeSchema })
  time: TimeSchema;

  /** 接收人邮箱列表 */
  @Prop({ required: true, type: [String], default: [] })
  recipient: string[];

  /** 页面ID列表 */
  @Prop({ required: true, type: [String], default: [] })
  pageIds: string[];

  /** 分支ID列表 */
  @Prop({ required: true, type: [String], default: [] })
  branchIds: string[];

  /** Cron 表达式 */
  @Prop({ required: true, type: String })
  cronExpression: string;

  /** 创建时间 */
  @Prop({ type: Date, default: Date.now })
  created: Date;

  /** 更新时间 */
  @Prop({ type: Date, default: Date.now })
  updated: Date;
}

/**
 * 创建 ScheduledTask Schema
 */
export const ScheduledTaskSchema = SchemaFactory.createForClass(ScheduledTask);

// 添加索引
ScheduledTaskSchema.index({ id: 1 }, { unique: true, sparse: false });
ScheduledTaskSchema.index({ enable: 1 }, { sparse: false });

