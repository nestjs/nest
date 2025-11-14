import { IsString, IsBoolean, IsArray, IsObject, ValidateNested, IsOptional, IsInt, Max, Min, IsEnum, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { WeekEnum } from '../enums/week.enum';
import { FrequencyEnum } from '../enums/frequency.enum';

/**
 * 时间配置数据传输对象
 * @class TimeDto
 */
class TimeDto {
  /** 具体时间（格式：HH:mm） */
  @IsString()
  time: string;

  /** 
   * 星期几（weekly 频率时必填）
   * @IsEnum(WeekEnum) - 必须是 WeekEnum 枚举中的值
   */
  @IsOptional()
  @IsEnum(WeekEnum)
  week?: WeekEnum;

  /** 
   * 日期（范围：1-31，monthly 频率时必填）
   * @IsInt() - 必须是整数
   * @Min(1) - 最小值是 1
   * @Max(31) - 最大值是 31
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;
}

/**
 * 创建或更新定时任务的数据传输对象
 * @class CreateScheduledTaskDto
 */
export class CreateScheduledTaskDto {
  /** 是否启用 */
  @IsBoolean()
  enable: boolean;

  /** 
   * 执行频率（enable: true 时必填）
   * @IsEnum(FrequencyEnum) - 必须是 FrequencyEnum 枚举中的值
   */
  @ValidateIf((o) => o.enable === true)
  @IsEnum(FrequencyEnum)
  frequency?: FrequencyEnum;

  /** 
   * 执行时间配置（enable: true 时必填）
   * @Type(() => TimeDto) - 将传入的普通对象转换为 TimeDto 类的实例，这样才能进行验证
   * @ValidateNested() - 验证嵌套对象内部的属性（验证 time 对象里的 time 和 week 字段）
   */
  @ValidateIf((o) => o.enable === true)
  @IsObject()
  @ValidateNested()
  @Type(() => TimeDto)
  time?: TimeDto;

  /** 
   * 接收人邮箱列表（enable: true 时必填）
   * @IsArray() - 验证该字段是一个数组
   * @IsString({ each: true }) - 验证数组中的每个元素都是字符串类型
   */
  @ValidateIf((o) => o.enable === true)
  @IsArray()
  @IsString({ each: true })
  recipient?: string[];

  /** 
   * 页面ID列表（enable: true 时必填）
   * @IsArray() - 验证该字段是一个数组
   * @IsString({ each: true }) - 验证数组中的每个元素都是字符串类型
   */
  @ValidateIf((o) => o.enable === true)
  @IsArray()
  @IsString({ each: true })
  pageIds?: string[];

  /** 
   * 分支ID列表（enable: true 时必填）
   * @IsArray() - 验证该字段是一个数组
   * @IsString({ each: true }) - 验证数组中的每个元素都是字符串类型
   */
  @ValidateIf((o) => o.enable === true)
  @IsArray()
  @IsString({ each: true })
  branchIds?: string[];
}
