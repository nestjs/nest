import {
  Body,
  Controller,
  MaxFileSizeValidator,
  Module,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import {
  AnyFilesInterceptor,
  type BunRequest,
  diskStorage,
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
  FileStreamInterceptor,
  type MultipartFileStream,
  NoFilesInterceptor,
  type UploadedMultipartFile,
} from '../../index.js';
import { bootstrap, isBun, type TestApp } from '../adapters/helpers.js';

let uploadDir = '';

const describeFile = (file?: UploadedMultipartFile) =>
  file && {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    content: file.buffer?.toString(),
  };

@Controller('upload')
class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  single(@UploadedFile() file: UploadedMultipartFile, @Body() body: unknown) {
    return { file: describeFile(file), body };
  }

  @Post('limited')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 4 } }))
  limited(@UploadedFile() file: UploadedMultipartFile) {
    return { file: describeFile(file) };
  }

  @Post('validated')
  @UseInterceptors(FileInterceptor('file'))
  validated(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 4 })],
      }),
    )
    file: UploadedMultipartFile,
  ) {
    return { file: describeFile(file) };
  }

  @Post('many')
  @UseInterceptors(FilesInterceptor('files', 2))
  many(@UploadedFiles() files: UploadedMultipartFile[]) {
    return { files: files.map(describeFile) };
  }

  @Post('fields')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'docs', maxCount: 2 },
    ]),
  )
  fields(@UploadedFiles() files: Record<string, UploadedMultipartFile[]>) {
    return {
      avatar: files.avatar?.map(describeFile),
      docs: files.docs?.map(describeFile),
    };
  }

  @Post('any')
  @UseInterceptors(AnyFilesInterceptor({ limits: { files: 2 } }))
  any(@UploadedFiles() files: UploadedMultipartFile[]) {
    return { names: files.map(f => f.fieldname) };
  }

  @Post('none')
  @UseInterceptors(NoFilesInterceptor())
  none(@Body() body: unknown, @Req() req: BunRequest) {
    return { body, file: req.file ?? null };
  }

  @Post('filtered')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      fileFilter: (_req, file, cb) =>
        cb(null, file.mimetype.startsWith('image/')),
    }),
  )
  filtered(@UploadedFiles() files: UploadedMultipartFile[]) {
    return { names: files.map(f => f.originalname) };
  }

  @Post('stream')
  @UseInterceptors(FileStreamInterceptor('file'))
  async stream(@UploadedFile() file: MultipartFileStream) {
    return { name: file.originalname, content: await text(file.stream) };
  }

  @Post('disk')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => cb(null, `saved-${file.originalname}`),
      }),
    }),
  )
  disk(@UploadedFile() file: UploadedMultipartFile) {
    return {
      path: file.path,
      filename: file.filename,
      size: file.size,
      buffer: file.buffer ?? null,
    };
  }
}

@Module({ controllers: [UploadController] })
class UploadModule {}

const form = (
  entries: [string, string | [content: string, name: string, type?: string]][],
) => {
  const data = new FormData();
  for (const [name, value] of entries) {
    if (typeof value === 'string') {
      data.append(name, value);
    } else {
      const [content, filename, type = 'text/plain'] = value;
      data.append(name, new Blob([content], { type }), filename);
    }
  }
  return { method: 'POST', body: data };
};

describe('multipart', () => {
  let t: TestApp;
  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'nest-bun-upload-'));
    t = await bootstrap(UploadModule);
  });
  afterAll(() => t.close());

  describe('FileInterceptor', () => {
    it('should expose the file and the text fields (with multer nesting)', async () => {
      const res = await t.json(
        '/upload/single',
        form([
          ['title', 'hello'],
          ['meta[tags][]', 'a'],
          ['meta[tags][]', 'b'],
          ['file', ['content', 'notes.txt']],
        ]),
      );
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        file: {
          fieldname: 'file',
          originalname: 'notes.txt',
          // Bun's Blob appends a charset to text types on the client side.
          mimetype: expect.stringMatching(/^text\/plain/),
          size: 7,
          content: 'content',
        },
        body: { title: 'hello', meta: { tags: ['a', 'b'] } },
      });
    });

    it('should pass non-multipart requests through untouched', async () => {
      const res = await t.json('/upload/single', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plain: true }),
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ body: { plain: true } });
    });

    it('should reject a file larger than limits.fileSize with a 413', async () => {
      const res = await t.json(
        '/upload/limited',
        form([['file', ['too large', 'big.txt']]]),
      );
      expect(res.status).toBe(413);
      expect(res.body.message).toBe('File too large');
    });

    it('should reject a file in an unexpected field', async () => {
      const res = await t.json(
        '/upload/single',
        form([['other', ['x', 'x.txt']]]),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Unexpected file field - other');
    });

    it('should work with ParseFilePipe validators', async () => {
      const res = await t.json(
        '/upload/validated',
        form([['file', ['too large', 'big.txt']]]),
      );
      expect(res.status).toBe(400);
    });

    it('should reject a malformed body with a 400', async () => {
      const res = await t.json('/upload/single', {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=xyz' },
        body: '--xyz\r\nContent-Disposition: form-data; name="a"\r\n\r\nunterminated',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('FilesInterceptor', () => {
    it('should accept up to maxCount files', async () => {
      const res = await t.json(
        '/upload/many',
        form([
          ['files', ['1', 'a.txt']],
          ['files', ['22', 'b.txt']],
        ]),
      );
      expect(res.body.files.map((f: any) => f.content)).toEqual(['1', '22']);
    });

    it('should reject more than maxCount files', async () => {
      const res = await t.json(
        '/upload/many',
        form([
          ['files', ['1', 'a.txt']],
          ['files', ['2', 'b.txt']],
          ['files', ['3', 'c.txt']],
        ]),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Unexpected file field - files');
    });

    it('should skip files rejected by fileFilter', async () => {
      const res = await t.json(
        '/upload/filtered',
        form([
          ['files', ['png', 'a.png', 'image/png']],
          ['files', ['txt', 'b.txt']],
        ]),
      );
      expect(res.body).toEqual({ names: ['a.png'] });
    });
  });

  it('should group files by field (FileFieldsInterceptor)', async () => {
    const res = await t.json(
      '/upload/fields',
      form([
        ['avatar', ['me', 'me.png', 'image/png']],
        ['docs', ['d1', 'd1.txt']],
        ['docs', ['d2', 'd2.txt']],
      ]),
    );
    expect(res.body.avatar.map((f: any) => f.content)).toEqual(['me']);
    expect(res.body.docs.map((f: any) => f.content)).toEqual(['d1', 'd2']);
  });

  it('should enforce limits.files (AnyFilesInterceptor)', async () => {
    const ok = await t.json(
      '/upload/any',
      form([
        ['a', ['1', 'a.txt']],
        ['b', ['2', 'b.txt']],
      ]),
    );
    expect(ok.body).toEqual({ names: ['a', 'b'] });
    const tooMany = await t.json(
      '/upload/any',
      form([
        ['a', ['1', 'a.txt']],
        ['b', ['2', 'b.txt']],
        ['c', ['3', 'c.txt']],
      ]),
    );
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toBe('Too many files');
  });

  it('should accept text fields and reject files (NoFilesInterceptor)', async () => {
    const ok = await t.json('/upload/none', form([['a', '1']]));
    expect(ok.body).toEqual({ body: { a: '1' }, file: null });
    const rejected = await t.json(
      '/upload/none',
      form([['f', ['x', 'x.txt']]]),
    );
    expect(rejected.status).toBe(400);
  });

  it('should hand over a readable stream (FileStreamInterceptor)', async () => {
    const res = await t.json(
      '/upload/stream',
      form([['file', ['streamed body', 's.txt']]]),
    );
    expect(res.body).toEqual({ name: 's.txt', content: 'streamed body' });
  });

  it.runIf(isBun)(
    'should write files with Bun.write (diskStorage)',
    async () => {
      const res = await t.json(
        '/upload/disk',
        form([['file', ['on disk', 'd.txt']]]),
      );
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        filename: 'saved-d.txt',
        size: 7,
        buffer: null,
      });
      expect(existsSync(res.body.path)).toBe(true);
      expect(readFileSync(res.body.path, 'utf8')).toBe('on disk');
    },
  );
});
