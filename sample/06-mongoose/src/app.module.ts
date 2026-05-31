import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CatsModule } from './cats/cats.module';
import { ScheduledTaskModule } from './scheduled-task/scheduled-task.module';
import { ReportExportModule } from './report-export/report-export.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { TaskExecutionRecordModule } from './task-execution-record/task-execution-record.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AppController } from './app.controller';
import { isDatabaseEnabled } from './runtime';

const databaseEnabled = isDatabaseEnabled();

const databaseImports = databaseEnabled
  ? [
      // 使用 ConfigService 获取 MongoDB URI
      MongooseModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          uri: configService.get<string>('MONGODB_URI'),
          retryWrites: true,
          w: 'majority',
          serverSelectionTimeoutMS: 5000,
        }),
        inject: [ConfigService],
      }),
      CommonModule,
      AuthModule,
      CatsModule,
      ScheduledTaskModule,
      ReportExportModule,
      TaskExecutionRecordModule,
    ]
  : [];

const authProviders = databaseEnabled
  ? [
      {
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
      },
    ]
  : [];

@Module({
  imports: [
    // 配置 ConfigModule，全局可用
    ConfigModule.forRoot({
      isGlobal: true, // 使 ConfigModule 全局可用
      envFilePath: ['.env.local', '.env'], // 支持本地覆盖配置
    }),
    ...databaseImports,
  ],
  controllers: [AppController],
  providers: [...authProviders],
})
export class AppModule { }
