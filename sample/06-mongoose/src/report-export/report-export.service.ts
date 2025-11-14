import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateExportTaskDto } from './dto/create-export-task.dto';
import { ExportTask, ExportTaskStatus } from './schemas/export-task.schema';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

@Injectable()
export class ReportExportService {
  // 当日最大导出次数
  private readonly MAX_DAILY_EXPORTS = 10;
  // 文件存储目录
  private readonly UPLOAD_DIR = join(process.cwd(), 'uploads', 'reports');
  // 基础URL（用于生成下载链接）
  private readonly BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  constructor(
    @InjectModel(ExportTask.name) private exportTaskModel: Model<ExportTask>,
  ) {
    // 确保上传目录存在
    if (!existsSync(this.UPLOAD_DIR)) {
      mkdirSync(this.UPLOAD_DIR, { recursive: true });
    }
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

    // 4. 异步执行导出任务（不阻塞响应）
    this.processExportTask(savedTask._id.toString()).catch((error) => {
      console.error('导出任务执行失败:', error);
    });

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

      // 构建完整的报表页面URL
      const reportUrl = this.buildReportUrl(task.reportPage, {
        startTime: task.startTime.toISOString(),
        endTime: task.endTime.toISOString(),
        assetId: task.assetId,
      });

      // 使用Puppeteer导出PDF
      const filePath = await this.exportToPdf(reportUrl, taskId);

      // 生成下载URL
      const downloadUrl = `/api/report-export/download/${taskId}`;

      // 更新任务状态为已完成
      task.status = ExportTaskStatus.COMPLETED;
      task.filePath = filePath;
      task.downloadUrl = downloadUrl;
      await task.save();
    } catch (error) {
      // 更新任务状态为失败
      task.status = ExportTaskStatus.FAILED;
      task.errorMessage = error.message || '导出失败';
      await task.save();
      throw error;
    }
  }

  /**
   * 获取Chrome可执行文件路径
   */
  private getChromeExecutablePath(): string | undefined {
    // macOS
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (process.platform === 'darwin' && existsSync(macPath)) {
      return macPath;
    }
    
    // Linux
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];
    if (process.platform === 'linux') {
      for (const path of linuxPaths) {
        if (existsSync(path)) {
          return path;
        }
      }
    }
    
    // Windows
    if (process.platform === 'win32') {
      const winPaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ];
      for (const path of winPaths) {
        if (existsSync(path)) {
          return path;
        }
      }
    }
    
    return undefined;
  }

  /**
   * 使用Puppeteer导出PDF
   */
  private async exportToPdf(url: string, taskId: string): Promise<string> {
    let browser;
    try {
      // 获取Chrome路径
      const executablePath = this.getChromeExecutablePath();
      
      // 启动浏览器配置
      const launchOptions: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      };
      
      // 如果找到系统Chrome，使用它
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }
      
      // 启动浏览器
      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();

      // 设置视口大小
      await page.setViewport({ width: 1920, height: 1080 });

      // 访问页面
      await page.goto(url, {
        waitUntil: 'networkidle0', // 等待网络空闲
        timeout: 60000, // 60秒超时
      });

      // 等待页面加载完成（可以根据实际情况调整）
      // 使用 Promise 和 setTimeout 替代已废弃的 waitForTimeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 生成文件名
      const fileName = `report_${taskId}_${randomUUID()}.pdf`;
      const filePath = join(this.UPLOAD_DIR, fileName);

      // 导出PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      return filePath;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
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
}

