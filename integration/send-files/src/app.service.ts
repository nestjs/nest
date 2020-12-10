import { Injectable, StreamableFile } from '@nestjs/common';
import { createReadStream, readFileSync } from 'fs';
import { join } from 'path';
import { NonFile } from './non-file';

@Injectable()
export class AppService {
  getReadStream(): StreamableFile {
    return new StreamableFile(
      createReadStream(join(process.cwd(), 'Readme.md')),
    );
  }

  getBuffer(): StreamableFile {
    return new StreamableFile(readFileSync(join(process.cwd(), 'Readme.md')));
  }

  getNonFile(): NonFile {
    return new NonFile('Hello world');
  }
}
