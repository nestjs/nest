import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import cookieParser = require('cookie-parser');
import * as mongoose from 'mongoose';
import { AppModule } from './app.module';
import { logger } from './common/logger';
import { idTransformPlugin } from './common/mongoose-id-transform.plugin';
import { getLogsDir, getPublicPath } from './runtime';

let mongoosePluginRegistered = false;

function ensureRuntimeDirectories(): void {
  // 确保日志目录存在
  const logsDir = getLogsDir();
  if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
  }
}

function registerMongoosePlugin(): void {
  if (mongoosePluginRegistered) {
    return;
  }

  mongoosePluginRegistered = true;
  // 注册全局 Mongoose 插件，统一将 _id 转换为 id
  // 必须在应用启动之前注册，这样所有 Schema 都会自动应用
  mongoose.plugin(idTransformPlugin);
}

function registerHtmlFallback(app: NestExpressApplication, publicPath: string): void {
  // 路由处理：根据路径返回对应的 HTML 文件
  app.use((req, res, next) => {
    // 如果是 API 请求，跳过
    if (req.path.startsWith('/api')) {
      return next();
    }

    // 如果是静态资源请求（如 .js, .css, .png 等），跳过
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return next();
    }

    let htmlFile = 'index.html';

    // 根据路径返回对应的 HTML 文件
    if (req.path === '/login' || req.path.startsWith('/login')) {
      htmlFile = 'login.html';
    } else if (req.path === '/register' || req.path.startsWith('/register')) {
      htmlFile = 'register.html';
    } else if (req.path === '/scheduled-tasks' || req.path.startsWith('/scheduled-tasks')) {
      htmlFile = 'scheduled-tasks.html';
    } else if (req.path === '/task-execution-records' || req.path.startsWith('/task-execution-records')) {
      htmlFile = 'task-execution-records.html';
    }

    try {
      const htmlPath = join(publicPath, htmlFile);
      if (existsSync(htmlPath)) {
        const html = readFileSync(htmlPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).send(`File not found: ${htmlFile}`);
      }
    } catch (error) {
      logger.error('读取 HTML 文件失败', {
        path: req.path,
        htmlFile,
        error: error.message,
      });
      res.status(500).send('Internal server error');
    }
  });
}

export async function createApp(): Promise<NestExpressApplication> {
  ensureRuntimeDirectories();
  registerMongoosePlugin();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 启用 cookie 解析中间件
  app.use(cookieParser());

  // 设置全局路由前缀（API 接口）
  app.setGlobalPrefix('api');

  // 配置静态文件服务 - 前端打包文件目录
  // 前端打包后的文件应该放在项目根目录的 'public' 文件夹下
  const publicPath = getPublicPath();
  app.useStaticAssets(publicPath, {
    prefix: '/', // 访问路径前缀，设置为根路径
    index: false, // 不自动提供 index.html，由中间件处理
  });

  // 启用全局验证管道，自动验证请求体
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动移除未在 DTO 中定义的属性
      forbidNonWhitelisted: true, // 如果请求包含未定义的属性，返回错误
      transform: true, // 自动将请求体转换为 DTO 实例
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
    }),
  );

  registerHtmlFallback(app, publicPath);

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3000;

  await app.listen(port);
  const url = await app.getUrl();
  logger.info('应用启动成功', {
    url,
    apiUrl: `${url}/api`,
  });
}

if (process.env.VERCEL !== '1') {
  bootstrap().catch((error) => {
    logger.error('应用启动失败', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
}
