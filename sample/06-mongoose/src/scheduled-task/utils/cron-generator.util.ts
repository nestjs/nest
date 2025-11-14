import { FrequencyEnum } from '../enums/frequency.enum';
import { WeekEnum } from '../enums/week.enum';

/**
 * Cron 表达式生成工具类
 * 根据频率和时间配置生成 Cron 表达式
 * @class CronGenerator
 */
export class CronGenerator {
  /**
   * 星期映射表：将星期枚举映射为 Cron 表达式中的数字
   * Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
   */
  private static readonly WEEK_MAP: { [key in WeekEnum]: string } = {
    [WeekEnum.MON]: '1',
    [WeekEnum.TUE]: '2',
    [WeekEnum.WED]: '3',
    [WeekEnum.THU]: '4',
    [WeekEnum.FRI]: '5',
    [WeekEnum.SAT]: '6',
    [WeekEnum.SUN]: '0',
  };

  /**
   * 根据 frequency 和 time 生成 Cron 表达式
   * @param {FrequencyEnum} frequency - 执行频率枚举
   * @param {object} time - 时间配置对象
   * @returns {string} 返回生成的 Cron 表达式
   * @throws {Error} 如果频率类型不支持或缺少必填字段则抛出错误
   */
  static generate(frequency: FrequencyEnum, time: { time: string; week?: WeekEnum; day?: number }): string {
    // 解析时间字符串（格式：HH:mm）
    const [hour, minute] = time.time.split(':').map(Number);

    // Cron 表达式格式：秒 分 时 日 月 星期
    // 秒固定为 0
    const second = '0';
    const min = minute.toString();
    const hr = hour.toString();

    switch (frequency) {
      case FrequencyEnum.DAILY:
        // 每天执行：0 分 时 * * *
        return `${second} ${min} ${hr} * * *`;

      case FrequencyEnum.WEEKLY:
        // 每周执行：需要 week 字段
        if (!time.week) {
          throw new Error('weekly 频率需要提供 week 字段');
        }
        const weekDay = this.WEEK_MAP[time.week];
        // 0 分 时 * * 星期
        return `${second} ${min} ${hr} * * ${weekDay}`;

      case FrequencyEnum.MONTHLY:
        // 每月执行：需要 day 字段
        if (!time.day) {
          throw new Error('monthly 频率需要提供 day 字段');
        }
        // 0 分 时 日 * *
        return `${second} ${min} ${hr} ${time.day} * *`;

      default:
        throw new Error(`不支持的频率类型: ${frequency}`);
    }
  }
}

