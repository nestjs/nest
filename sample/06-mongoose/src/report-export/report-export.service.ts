import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateExportTaskDto } from './dto/create-export-task.dto';
import { ExportTask, ExportTaskStatus } from './schemas/export-task.schema';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { spawn, ChildProcess } from 'child_process';
const pLimit = require('p-limit');
import { logger } from '../common/logger';

@Injectable()
export class ReportExportService {
  // 当日最大导出次数
  private readonly MAX_DAILY_EXPORTS = 10;
  // 文件存储目录
  private readonly UPLOAD_DIR = join(process.cwd(), 'uploads', 'reports');
  // 基础URL（用于生成下载链接）
  private readonly BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  // 最大并发导出任务数（同时运行的浏览器实例数）
  // 可以根据服务器性能调整，建议 2-5 个
  private readonly MAX_CONCURRENT_EXPORTS = parseInt(
    process.env.MAX_CONCURRENT_EXPORTS || '2',
    10,
  );
  // 任务超时时间（毫秒），默认 5 分钟
  private readonly TASK_TIMEOUT = parseInt(
    process.env.EXPORT_TASK_TIMEOUT || '300000',
    10,
  );
  // 并发限制器
  private readonly limit = pLimit(this.MAX_CONCURRENT_EXPORTS);
  // Worker 进程路径（根据环境自动选择）
  private readonly workerPath = this.getWorkerPath();

  constructor(
    @InjectModel(ExportTask.name) private exportTaskModel: Model<ExportTask>,
  ) {
    // 确保上传目录存在
    if (!existsSync(this.UPLOAD_DIR)) {
      mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
    // 确保日志目录存在
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    logger.info('报表导出服务初始化完成', {
      maxConcurrent: this.MAX_CONCURRENT_EXPORTS,
      uploadDir: this.UPLOAD_DIR,
      taskTimeout: this.TASK_TIMEOUT,
    });
  }

  /**
   * 创建导出任务
   */
  async createExportTask(createDto: CreateExportTaskDto): Promise<ExportTask> {
    // 1. 验证参数
    this.validateParams(createDto);

    // 2. 检查当日导出次数
    await this.checkDailyExportLimit(createDto.assetId);

    // 3. 创建任务记录（状态：待处理）
    const task = new this.exportTaskModel({
      ...createDto,
      startTime: new Date(createDto.startTime),
      endTime: new Date(createDto.endTime),
      status: ExportTaskStatus.PENDING,
    });
    const savedTask = await task.save();

    // 4. 使用并发限制器异步执行导出任务（不阻塞响应）
    // 这样可以控制同时运行的浏览器实例数量，避免服务器崩溃
    this.limit(() => this.processExportTask(savedTask._id.toString())).catch(
      (error) => {
        logger.error('导出任务执行失败', {
          taskId: savedTask._id.toString(),
          error: error.message,
          stack: error.stack,
        });
      },
    );

    return savedTask;
  }

  /**
   * 验证参数
   */
  private validateParams(dto: CreateExportTaskDto): void {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    // 验证时间范围
    if (startTime >= endTime) {
      throw new BadRequestException('开始时间必须小于结束时间');
    }

    // 验证时间范围不能超过一年
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (endTime.getTime() - startTime.getTime() > oneYear) {
      throw new BadRequestException('时间范围不能超过一年');
    }

    // 验证报表页面URL格式
    if (!this.isValidUrl(dto.reportPage) && !dto.reportPage.startsWith('/')) {
      throw new BadRequestException('报表页面必须是有效的URL或路径');
    }
  }

  /**
   * 检查当日导出次数限制
   */
  private async checkDailyExportLimit(assetId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayExports = await this.exportTaskModel.countDocuments({
      assetId,
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    if (todayExports >= this.MAX_DAILY_EXPORTS) {
      throw new BadRequestException(
        `当日导出次数已达上限（${this.MAX_DAILY_EXPORTS}次），请明天再试`,
      );
    }
  }

  /**
   * 处理导出任务
   */
  private async processExportTask(taskId: string): Promise<void> {
    const task = await this.exportTaskModel.findById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    try {
      // 更新状态为处理中
      task.status = ExportTaskStatus.PROCESSING;
      await task.save();

      logger.info('开始处理导出任务', {
        taskId,
        assetId: task.assetId,
        reportPage: task.reportPage,
      });

      // 构建完整的报表页面URL
      const reportUrl = this.buildReportUrl(task.reportPage, {
        startTime: task.startTime.toISOString(),
        endTime: task.endTime.toISOString(),
        assetId: task.assetId,
      });

      // 使用子进程导出PDF（带超时控制）
      const filePath = await Promise.race([
        this.exportToPdfViaWorker(reportUrl, taskId),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`任务超时（${this.TASK_TIMEOUT / 1000}秒）`)),
            this.TASK_TIMEOUT,
          ),
        ),
      ]);

      // 生成下载URL
      const downloadUrl = `/api/report-export/download/${taskId}`;

      // 更新任务状态为已完成
      task.status = ExportTaskStatus.COMPLETED;
      task.filePath = filePath;
      task.downloadUrl = downloadUrl;
      await task.save();

      logger.info('导出任务完成', {
        taskId,
        filePath,
        downloadUrl,
      });
    } catch (error) {
      // 更新任务状态为失败
      task.status = ExportTaskStatus.FAILED;
      task.errorMessage = error.message || '导出失败';
      await task.save();

      logger.error('导出任务失败', {
        taskId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * 获取 Worker 进程路径
   */
  private getWorkerPath(): string {
    // 检查是否在编译后的 dist 目录中运行
    const compiledPath = join(__dirname, 'workers', 'pdf-export.worker.js');
    if (existsSync(compiledPath)) {
      return compiledPath;
    }

    // 开发环境：使用 ts-node 运行 TypeScript 文件
    const tsPath = join(__dirname, 'workers', 'pdf-export.worker.ts');
    if (existsSync(tsPath)) {
      // 返回 TypeScript 文件路径，fork 时会使用 ts-node 执行
      return tsPath;
    }

    throw new Error('找不到 Worker 文件');
  }

  /**
   * 通过子进程（Worker）导出PDF - 使用 spawn
   * 通过 stdin/stdout 进行 JSON 通信
   * 这样可以隔离浏览器实例，避免影响主进程
   */
  private async exportToPdfViaWorker(url: string, taskId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.info('启动 PDF 导出 Worker 进程（spawn）', {
        taskId,
        url,
        workerPath: this.workerPath,
      });

      // 准备 spawn 参数
      const isTsFile = this.workerPath.endsWith('.ts');
      const nodeExecutable = process.execPath; // Node.js 可执行文件路径
      const args = isTsFile
        ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', this.workerPath]
        : [this.workerPath];

      // 使用 spawn 启动子进程
      const worker: ChildProcess = spawn(nodeExecutable, args, {
        stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development',
        },
      });

      // 设置超时
      const timeout = setTimeout(() => {
        logger.error('Worker 进程超时', { taskId });
        worker.kill('SIGTERM');
        reject(new Error(`Worker 进程超时（${this.TASK_TIMEOUT / 1000}秒）`));
      }, this.TASK_TIMEOUT);

      let stdoutData = '';
      let stderrData = '';

      // 收集 stdout 数据
      worker.stdout?.on('data', (data: Buffer) => {
        stdoutData += data.toString();
      });

      // 收集 stderr 数据（可能包含日志输出）
      worker.stderr?.on('data', (data: Buffer) => {
        stderrData += data.toString();
        // stderr 可能包含 winston 的日志输出，记录但不作为错误
        logger.debug('Worker stderr', { taskId, data: data.toString() });
      });

      // 监听进程退出
      worker.on('exit', (code, signal) => {
        clearTimeout(timeout);

        if (code === 0) {
          try {
            // 解析 JSON 输出（取最后一行，因为可能有日志输出）
            const lines = stdoutData.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);

            if (result.type === 'success') {
              logger.info('Worker 进程完成', {
                taskId,
                filePath: result.filePath,
              });
              resolve(result.filePath);
            } else if (result.type === 'error') {
              logger.error('Worker 进程失败', {
                taskId,
                error: result.error,
              });
              reject(new Error(result.error || 'PDF 导出失败'));
            } else {
              reject(new Error('未知的响应类型'));
            }
          } catch (error) {
            logger.error('解析 Worker 输出失败', {
              taskId,
              error: error.message,
              stdout: stdoutData,
            });
            reject(new Error(`解析 Worker 输出失败: ${error.message}`));
          }
        } else {
          logger.error('Worker 进程异常退出', {
            taskId,
            code,
            signal,
            stderr: stderrData,
          });
          reject(
            new Error(
              `Worker 进程异常退出，退出码: ${code}，错误: ${stderrData}`,
            ),
          );
        }
      });

      // 监听进程错误
      worker.on('error', (error) => {
        clearTimeout(timeout);
        logger.error('Worker 进程错误', {
          taskId,
          error: error.message,
          stack: error.stack,
        });
        reject(error);
      });

      // 通过 stdin 发送任务数据
      const taskData = JSON.stringify({
        type: 'export-pdf',
        taskId,
        url,
        uploadDir: this.UPLOAD_DIR,
      });

      worker.stdin?.write(taskData + '\n');
      worker.stdin?.end();
    });
  }

  /**
   * 构建报表页面URL
   */
  private buildReportUrl(reportPage: string, params: Record<string, string>): string {
    // 如果是完整URL，直接使用
    if (this.isValidUrl(reportPage)) {
      const url = new URL(reportPage);
      Object.keys(params).forEach((key) => {
        url.searchParams.append(key, params[key]);
      });
      return url.toString();
    }

    // 如果是相对路径，构建完整URL
    const baseUrl = this.BASE_URL;
    const url = new URL(reportPage, baseUrl);
    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key]);
    });
    return url.toString();
  }

  /**
   * 验证URL格式
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取所有导出任务列表
   */
  async findAll(assetId?: string): Promise<ExportTask[]> {
    const query = assetId ? { assetId } : {};
    return this.exportTaskModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * 根据ID获取任务
   */
  async findOne(taskId: string): Promise<ExportTask> {
    const task = await this.exportTaskModel.findById(taskId).exec();
    if (!task) {
      throw new HttpException('任务不存在', HttpStatus.NOT_FOUND);
    }
    return task;
  }

  /**
   * 获取任务文件路径
   */
  async getTaskFilePath(taskId: string): Promise<string> {
    const task = await this.findOne(taskId);
    if (task.status !== ExportTaskStatus.COMPLETED || !task.filePath) {
      throw new HttpException('文件不存在或任务未完成', HttpStatus.NOT_FOUND);
    }
    return task.filePath;
  }

  /**
   * 获取队列状态信息
   */
  async getQueueStatus(): Promise<{
    maxConcurrent: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      this.exportTaskModel.countDocuments({ status: ExportTaskStatus.PENDING }),
      this.exportTaskModel.countDocuments({
        status: ExportTaskStatus.PROCESSING,
      }),
      this.exportTaskModel.countDocuments({
        status: ExportTaskStatus.COMPLETED,
      }),
      this.exportTaskModel.countDocuments({ status: ExportTaskStatus.FAILED }),
    ]);

    return {
      maxConcurrent: this.MAX_CONCURRENT_EXPORTS,
      pending,
      processing,
      completed,
      failed,
    };
  }
}

