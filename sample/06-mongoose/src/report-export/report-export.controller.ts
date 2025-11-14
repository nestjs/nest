import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportExportService } from './report-export.service';
import { CreateExportTaskDto } from './dto/create-export-task.dto';
import { readFileSync, existsSync } from 'fs';

/**
 * 报表导出控制器
 */
@Controller('report-export')
export class ReportExportController {
  constructor(private readonly reportExportService: ReportExportService) {}

  /**
   * 创建导出任务
   * @route POST /api/report-export
   */
  @Post()
  async createExportTask(@Body() createDto: CreateExportTaskDto) {
    return this.reportExportService.createExportTask(createDto);
  }

  /**
   * 获取导出任务列表
   * @route GET /api/report-export
   * @query assetId - 可选，按资产ID筛选
   */
  @Get()
  async getExportTasks(@Query('assetId') assetId?: string) {
    const tasks = await this.reportExportService.findAll(assetId);
    return {
      tasks,
      total: tasks.length,
    };
  }

  /**
   * 获取队列状态
   * @route GET /api/report-export/queue/status
   */
  @Get('queue/status')
  async getQueueStatus() {
    return this.reportExportService.getQueueStatus();
  }

  /**
   * 获取单个任务详情
   * @route GET /api/report-export/:id
   */
  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.reportExportService.findOne(id);
  }

  /**
   * 下载PDF文件
   * @route GET /api/report-export/download/:id
   */
  @Get('download/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const filePath = await this.reportExportService.getTaskFilePath(id);
      
      if (!existsSync(filePath)) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: '文件不存在',
        });
      }

      // 读取文件
      const file = readFileSync(filePath);
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="report_${id}.pdf"`,
      );
      
      // 发送文件
      res.send(file);
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: error.message || '文件不存在',
      });
    }
  }
}

