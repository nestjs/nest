import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // 设置全局路由前缀（API 接口）
  app.setGlobalPrefix('api');
  
  // 配置静态文件服务 - 前端打包文件目录
  // 前端打包后的文件应该放在项目根目录的 'public' 文件夹下
  const publicPath = join(__dirname, '..', 'public');
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
  
  // SPA 路由回退：所有非 API 路由都返回 index.html（支持前端路由）
  app.use((req, res, next) => {
    // 如果是 API 请求，跳过
    if (req.path.startsWith('/api')) {
      return next();
    }
    
    // 如果是静态资源请求（如 .js, .css, .png 等），跳过
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      return next();
    }
    
    // 其他所有请求都返回 index.html（支持前端路由）
    try {
      const indexHtml = readFileSync(join(publicPath, 'index.html'), 'utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(indexHtml);
    } catch (error) {
      // 如果 index.html 不存在，返回 404
      res.status(404).send('Frontend files not found. Please build your frontend and place files in the "public" folder.');
    }
  });
  
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Frontend files served from: ${publicPath}`);
  console.log(`API endpoints available at: ${await app.getUrl()}/api`);
}
bootstrap();
