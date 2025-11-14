import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportExportController } from './report-export.controller';
import { ReportExportService } from './report-export.service';
import { ExportTask, ExportTaskSchema } from './schemas/export-task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExportTask.name, schema: ExportTaskSchema },
    ]),
  ],
  controllers: [ReportExportController],
  providers: [ReportExportService],
  exports: [ReportExportService],
})
export class ReportExportModule {}

