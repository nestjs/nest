import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloService {
  greeting(): string {
    return 'Hello world!';
  }
}
