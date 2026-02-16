import {
  Controller,
  Module,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  FileInterceptor,
  FilesInterceptor,
  FileFieldsInterceptor,
  AnyFilesInterceptor,
  NoFilesInterceptor,
  FileStreamInterceptor,
  FilesStreamInterceptor,
  AnyFilesStreamInterceptor,
  H3UploadedFile,
  H3MulterField,
  H3FormField,
  UploadedFields,
  FormBody,
  FormField,
  diskStorage,
} from '@nestjs/platform-h3';

// Create a temp directory for disk storage tests
const uploadDir = path.join(os.tmpdir(), 'h3-upload-test');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
      content: file.buffer?.toString('utf-8'),
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
        content: file.buffer?.toString('utf-8'),
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
        content: file.buffer?.toString('utf-8'),
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
        content: file.buffer?.toString('utf-8'),
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

  // === Form Fields Tests ===

  @Post('with-form-fields')
  @UseInterceptors(FileInterceptor('file'))
  uploadWithFormFields(
    @UploadedFile() file: H3UploadedFile,
    @UploadedFields() fields: H3FormField[],
  ) {
    return {
      file: file
        ? {
            fieldname: file.fieldname,
            originalname: file.originalname,
            size: file.size,
          }
        : null,
      fields: fields,
    };
  }

  @Post('form-body')
  @UseInterceptors(FileInterceptor('file'))
  uploadWithFormBody(
    @UploadedFile() file: H3UploadedFile,
    @FormBody() body: Record<string, string | string[]>,
  ) {
    return {
      file: file
        ? {
            fieldname: file.fieldname,
            originalname: file.originalname,
          }
        : null,
      body: body,
    };
  }

  @Post('form-field')
  @UseInterceptors(FileInterceptor('file'))
  uploadWithFormField(
    @UploadedFile() file: H3UploadedFile,
    @FormField('username') username: string,
    @FormField('email') email: string,
  ) {
    return {
      file: file
        ? {
            fieldname: file.fieldname,
            originalname: file.originalname,
          }
        : null,
      username,
      email,
    };
  }

  @Post('no-files')
  @UseInterceptors(NoFilesInterceptor())
  uploadNoFiles(@UploadedFields() fields: H3FormField[]) {
    return {
      fields: fields,
    };
  }

  // === Disk Storage Tests ===

  @Post('disk-storage')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  )
  uploadToDisk(@UploadedFile() file: H3UploadedFile) {
    if (!file) {
      return { message: 'No file uploaded' };
    }
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      size: file.size,
      destination: file.destination,
      filename: file.filename,
      path: file.path,
      hasPath: !!file.path,
    };
  }

  @Post('disk-storage-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  )
  uploadMultipleToDisk(@UploadedFiles() files: H3UploadedFile[]) {
    if (!files || files.length === 0) {
      return { message: 'No files uploaded', count: 0 };
    }
    return {
      count: files.length,
      files: files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        size: file.size,
        destination: file.destination,
        filename: file.filename,
        path: file.path,
        hasPath: !!file.path,
      })),
    };
  }

  @Post('disk-storage-any')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: uploadDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  )
  uploadAnyToDisk(@UploadedFiles() files: H3UploadedFile[]) {
    if (!files || files.length === 0) {
      return { message: 'No files uploaded', count: 0 };
    }
    return {
      count: files.length,
      files: files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        size: file.size,
        destination: file.destination,
        filename: file.filename,
        path: file.path,
        hasPath: !!file.path,
      })),
    };
  }

  // === Stream Processing with Form Fields ===

  @Post('stream-with-fields')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: uploadDir }),
    }),
  )
  streamWithFields(
    @UploadedFile() file: H3UploadedFile,
    @UploadedFields() fields: H3FormField[],
  ) {
    return {
      file: file
        ? {
            fieldname: file.fieldname,
            originalname: file.originalname,
            size: file.size,
            hasPath: !!file.path,
          }
        : null,
      fields: fields,
    };
  }

  // === Dest shorthand for disk storage ===

  @Post('dest-shorthand')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: uploadDir,
    }),
  )
  uploadWithDest(@UploadedFile() file: H3UploadedFile) {
    if (!file) {
      return { message: 'No file uploaded' };
    }
    return {
      fieldname: file.fieldname,
      originalname: file.originalname,
      size: file.size,
      hasPath: !!file.path,
      destination: file.destination,
    };
  }
}

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
