import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  Module,
  ParseFilePipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { createHash } from 'crypto';
import multer from 'multer';
import type { Readable } from 'stream';
import type { UploadApi } from './upload-api.js';

/** Everything about a stored file that is comparable across runs. */
export function describeFile(file: any) {
  if (!file) {
    return file;
  }
  return {
    keys: Object.keys(file),
    fieldname: file.fieldname,
    originalname: file.originalname,
    encoding: file.encoding,
    mimetype: file.mimetype,
    size: file.size,
    content: file.buffer?.toString('latin1'),
    onDisk: file.path
      ? file.path === `${file.destination}/${file.filename}`
      : undefined,
  };
}

const describeFiles = (files: any): any =>
  Array.isArray(files)
    ? files.map(describeFile)
    : files &&
      Object.fromEntries(
        Object.entries(files).map(([key, value]) => [
          key,
          describeFiles(value),
        ]),
      );

export async function hashStream(stream: Readable) {
  const hash = createHash('sha256');
  let size = 0;
  for await (const chunk of stream) {
    hash.update(chunk);
    size += chunk.length;
  }
  return { hash: hash.digest('hex'), size };
}

/** Where the `engine-disk` route stores its files. */
export const engineDir = (uploadDir: string) => `${uploadDir}-engine`;

/** Hashes a streamed (Fastify) or buffered (Express) upload alike. */
async function describeUpload(file: any, body: any) {
  const { hash, size } = file.stream
    ? await hashStream(file.stream)
    : {
        hash: createHash('sha256').update(file.buffer).digest('hex'),
        size: file.size,
      };
  return { hash, size, originalname: file.originalname, body };
}

/**
 * One controller, written once against `UploadApi`. The Express and the
 * Fastify application differ only in which implementation is passed in,
 * which is the claim under test: switching adapters only changes the import.
 */
export function createUploadModule(
  api: UploadApi,
  uploadDir: string,
  moduleOptions?: object,
) {
  @Controller()
  class UploadController {
    @Post('single')
    @UseInterceptors(api.FileInterceptor('avatar'))
    single(
      @UploadedFile() file: any,
      @Body() body: any,
      @UploadedFiles() files: any,
    ) {
      return { file: describeFile(file), body, files: typeof files };
    }

    @Post('validated')
    @UseInterceptors(api.FileInterceptor('avatar'))
    validated(
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 100 }),
            new FileTypeValidator({ fileType: 'image/png' }),
          ],
        }),
      )
      file: any,
    ) {
      return { file: describeFile(file) };
    }

    @Post('many')
    @UseInterceptors(api.FilesInterceptor('docs', 2))
    many(
      @UploadedFiles() files: any,
      @Body() body: any,
      @UploadedFile() file: any,
    ) {
      return { files: describeFiles(files), body, file: typeof file };
    }

    @Post('fields')
    @UseInterceptors(
      api.FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'background', maxCount: 2 },
      ]),
    )
    fields(@UploadedFiles() files: any) {
      return { files: describeFiles(files) };
    }

    @Post('any')
    @UseInterceptors(api.AnyFilesInterceptor())
    any(@UploadedFiles() files: any) {
      return { files: describeFiles(files) };
    }

    @Post('none')
    @UseInterceptors(api.NoFilesInterceptor())
    none(
      @Body() body: any,
      @UploadedFile() file: any,
      @UploadedFiles() files: any,
    ) {
      return { body, file: typeof file, files: typeof files };
    }

    @Post('limited')
    @UseInterceptors(
      api.AnyFilesInterceptor({ limits: { fileSize: 4, files: 2, fields: 2 } }),
    )
    limited(@UploadedFiles() files: any) {
      return { files: describeFiles(files) };
    }

    @Post('text-limits')
    @UseInterceptors(
      api.NoFilesInterceptor({ limits: { fieldSize: 3, fieldNameSize: 5 } }),
    )
    textLimits(@Body() body: any) {
      return { body };
    }

    @Post('parts')
    @UseInterceptors(api.AnyFilesInterceptor({ limits: { parts: 2 } }))
    parts(@Body() body: any) {
      return { body };
    }

    @Post('filtered')
    @UseInterceptors(
      api.AnyFilesInterceptor({
        fileFilter: (
          _req: any,
          file: any,
          cb: (err: Error | null, accept: boolean) => void,
        ) =>
          file.mimetype === 'text/plain'
            ? cb(null, true)
            : file.originalname === 'evil.exe'
              ? cb(new BadRequestException('No executables'), false)
              : cb(null, false),
      }),
    )
    filtered(@UploadedFiles() files: any) {
      return { files: describeFiles(files) };
    }

    @Post('disk')
    @UseInterceptors(
      api.FilesInterceptor('docs', 5, {
        dest: uploadDir,
        limits: { fileSize: 10 },
      }),
    )
    disk(@UploadedFiles() files: any) {
      return { files: describeFiles(files) };
    }

    // A third-party storage engine: multer's own disk storage.
    @Post('engine-disk')
    @UseInterceptors(
      api.FileInterceptor('doc', {
        storage: multer.diskStorage({ destination: engineDir(uploadDir) }),
      }),
    )
    engineDisk(@UploadedFile() file: any) {
      return { file: describeFile(file) };
    }

    // A storage engine that fails: the destination does not exist.
    @Post('unwritable')
    @UseInterceptors(
      api.FileInterceptor('doc', {
        storage: multer.diskStorage({
          destination: (_req, _file, cb) =>
            cb(null, `${engineDir(uploadDir)}/missing`),
        }),
      }),
    )
    unwritable() {}

    // Module-level defaults (MulterModule / MultipartModule.register)
    // merged with a route-level `limits.files`.
    @Post('defaults')
    @UseInterceptors(api.AnyFilesInterceptor({ limits: { files: 1 } }))
    defaults(@UploadedFiles() files: any) {
      return { files: describeFiles(files) };
    }

    // On Express, the reference for the streaming route: the same hash,
    // computed from a buffer.
    @Post('hash')
    @UseInterceptors(
      api.FileStreamInterceptor
        ? api.FileStreamInterceptor('upload', {
            limits: { fileSize: 64 * 1024 },
          })
        : api.FileInterceptor('upload', { limits: { fileSize: 64 * 1024 } }),
    )
    async hash(@UploadedFile() file: any, @Body() body: any) {
      return describeUpload(file, body);
    }

    // A limit small enough to be exceeded by the chunk that carries the
    // start of the file.
    @Post('hash-small')
    @UseInterceptors(
      api.FileStreamInterceptor
        ? api.FileStreamInterceptor('upload', { limits: { fileSize: 4 } })
        : api.FileInterceptor('upload', { limits: { fileSize: 4 } }),
    )
    async hashSmall(@UploadedFile() file: any, @Body() body: any) {
      return describeUpload(file, body);
    }
  }

  @Module({
    imports: moduleOptions ? [api.OptionsModule.register(moduleOptions)] : [],
    controllers: [UploadController],
  })
  class UploadModule {}
  return UploadModule;
}
