/**
 * PDF 导出 Worker 进程
 * 在独立的子进程中运行，处理 Puppeteer 相关的 PDF 导出任务
 * 这样可以隔离浏览器实例，避免影响主进程
 */

import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import * as winston from 'winston';

// Worker 进程的日志配置
// 注意：在 spawn 模式下，日志必须输出到 stderr，避免干扰 stdout 的 JSON 输出
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'pdf-export-worker' },
  transports: [
    new winston.transports.Console({
      // 输出到 stderr，避免干扰 stdout 的 JSON 输出
      stderrLevels: ['error', 'warn', 'info', 'debug'],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}] [Worker]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        }),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/worker-error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/worker-combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

/**
 * 获取 Chrome 可执行文件路径
 */
function getChromeExecutablePath(): string | undefined {
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
 * 导出 PDF
 */
async function exportToPdf(
  url: string,
  taskId: string,
  uploadDir: string,
): Promise<string> {
  let browser;
  try {
    logger.info(`开始导出 PDF，任务ID: ${taskId}，URL: ${url}`);

    // 获取 Chrome 路径
    const executablePath = getChromeExecutablePath();

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

    // 如果找到系统 Chrome，使用它
    if (executablePath) {
      launchOptions.executablePath = executablePath;
      logger.info(`使用系统 Chrome: ${executablePath}`);
    } else {
      logger.warn('未找到系统 Chrome，使用 Puppeteer 自带的浏览器');
    }

    // 启动浏览器
    browser = await puppeteer.launch(launchOptions);
    logger.info('浏览器启动成功');

    const page = await browser.newPage();

    // 设置视口大小
    await page.setViewport({ width: 1920, height: 1080 });

    // 访问页面
    logger.info(`正在访问页面: ${url}`);
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // 等待页面加载完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 生成文件名
    const fileName = `report_${taskId}_${randomUUID()}.pdf`;
    const filePath = join(uploadDir, fileName);

    logger.info(`开始生成 PDF 文件: ${filePath}`);

    // 导出 PDF
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

    logger.info(`PDF 导出成功: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`PDF 导出失败，任务ID: ${taskId}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      logger.info('浏览器已关闭');
    }
  }
}

/**
 * 处理来自主进程的消息 - 使用 stdin/stdout 通信（spawn 模式）
 */
function handleStdinStdoutMode(): void {
  logger.info('Worker 启动（stdin/stdout 模式）');

  let inputData = '';

  // 从 stdin 读取数据
  process.stdin.on('data', (chunk: Buffer) => {
    inputData += chunk.toString();
  });

  process.stdin.on('end', async () => {
    try {
      // 解析输入数据
      const message = JSON.parse(inputData.trim());

      if (message.type === 'export-pdf') {
        const filePath = await exportToPdf(
          message.url,
          message.taskId,
          message.uploadDir,
        );

        // 输出结果到 stdout（JSON 格式）
        // 注意：只输出 JSON，日志会输出到 stderr，不会影响 JSON 解析
        const result = {
          type: 'success',
          taskId: message.taskId,
          filePath,
        };
        console.log(JSON.stringify(result));
        process.exit(0);
      } else {
        throw new Error(`未知的消息类型: ${message.type}`);
      }
    } catch (error) {
      // 输出错误到 stdout
      const result = {
        type: 'error',
        taskId: (() => {
          try {
            return JSON.parse(inputData.trim()).taskId || 'unknown';
          } catch {
            return 'unknown';
          }
        })(),
        error: error.message,
      };
      // 使用 console.error 输出 JSON，但主进程会从 stdout 读取
      // 为了保持一致性，也使用 console.log
      console.log(JSON.stringify(result));
      process.exit(1);
    }
  });

  process.stdin.on('error', (error) => {
    logger.error('读取 stdin 失败', { error: error.message });
    process.exit(1);
  });
}

// 启动处理（spawn 模式）
handleStdinStdoutMode();

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Worker 进程未捕获的异常', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Worker 进程未处理的 Promise 拒绝', {
    reason,
    promise,
  });
  process.exit(1);
});

logger.info('PDF 导出 Worker 进程已启动');

