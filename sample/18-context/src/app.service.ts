import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  get() {
    return 'Hello world!';
  }
}
