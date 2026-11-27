import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    // Multer keeps uploads in memory and has no file size limit by default.
    MulterModule.register({ limits: { fileSize: 1024 * 1024 } }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
