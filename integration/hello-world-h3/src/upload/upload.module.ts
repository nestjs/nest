import {
  Controller,
  Module,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
  AnyFilesInterceptor,
  H3UploadedFile,
  H3MulterField,
} from '@nestjs/platform-h3';

@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadSingle(@UploadedFile() file: H3UploadedFile) {
    if (!file) {
      return { message: 'No file uploaded' };
    }
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      content: file.buffer.toString('utf-8'),
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 3))
  uploadMultiple(@UploadedFiles() files: H3UploadedFile[]) {
    if (!files || files.length === 0) {
      return { message: 'No files uploaded', count: 0 };
    }
    return {
      count: files.length,
      files: files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content: file.buffer.toString('utf-8'),
      })),
    };
  }

  @Post('fields')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'documents', maxCount: 3 },
    ] as H3MulterField[]),
  )
  uploadFields(@UploadedFiles() files: Record<string, H3UploadedFile[]>) {
    const result: Record<string, any> = {};
    for (const [fieldName, fieldFiles] of Object.entries(files)) {
      result[fieldName] = fieldFiles.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content: file.buffer.toString('utf-8'),
      }));
    }
    return result;
  }

  @Post('any')
  @UseInterceptors(AnyFilesInterceptor())
  uploadAny(@UploadedFiles() files: H3UploadedFile[]) {
    if (!files || files.length === 0) {
      return { message: 'No files uploaded', count: 0 };
    }
    return {
      count: files.length,
      files: files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content: file.buffer.toString('utf-8'),
      })),
    };
  }

  @Post('with-limits')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100, // 100 bytes max
      },
    }),
  )
  uploadWithLimits(@UploadedFile() file: H3UploadedFile) {
    if (!file) {
      return { message: 'No file uploaded' };
    }
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      size: file.size,
    };
  }
}

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
