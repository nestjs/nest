import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * 导出任务状态枚举
 */
export enum ExportTaskStatus {
  PENDING = 'pending', // 待处理
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
}

/**
 * 导出任务Schema
 */
@Schema({ timestamps: true })
export class ExportTask extends Document {
  /** 任务名称 */
  @Prop({ type: String })
  taskName?: string;

  /** 开始时间 */
  @Prop({ type: Date, required: true })
  startTime: Date;

  /** 结束时间 */
  @Prop({ type: Date, required: true })
  endTime: Date;

  /** 资产ID */
  @Prop({ type: String, required: true, index: true })
  assetId: string;

  /** 报表页面URL或路径 */
  @Prop({ type: String, required: true })
  reportPage: string;

  /** 任务状态 */
  @Prop({
    type: String,
    enum: ExportTaskStatus,
    default: ExportTaskStatus.PENDING,
    index: true,
  })
  status: ExportTaskStatus;

  /** PDF文件路径 */
  @Prop({ type: String })
  filePath?: string;

  /** 下载URL */
  @Prop({ type: String })
  downloadUrl?: string;

  /** 错误信息 */
  @Prop({ type: String })
  errorMessage?: string;

  /** 创建时间 */
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  /** 更新时间 */
  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const ExportTaskSchema = SchemaFactory.createForClass(ExportTask);

// 创建索引
ExportTaskSchema.index({ assetId: 1, createdAt: -1 });
ExportTaskSchema.index({ status: 1, createdAt: -1 });

