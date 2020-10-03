import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  getHello(): { hello: string } {
    return { hello: 'world' };
  }
}