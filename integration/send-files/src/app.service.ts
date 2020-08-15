import { Injectable } from '@nestjs/common';
import { createReadStream, readFileSync } from 'fs';
import { Readable } from 'stream';
import { join } from 'path';

@Injectable()
export class AppService {

  getReadStream(): Readable {
    return createReadStream(join(process.cwd(), 'Readme.md'));
  }

  getBuffer(): Buffer {
    return readFileSync(join(process.cwd(), 'Readme.md'));
  }
}