import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return { hello: 'world' };
  }
}