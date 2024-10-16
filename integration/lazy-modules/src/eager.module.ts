import { Module, Injectable } from '@nestjs/common';
import { GlobalService } from './global.module';

@Injectable()
export class EagerService {
  private counter = 0;
  constructor(public globalService: GlobalService) {}

  sayHello() {
    this.counter++;
    return 'Hi! Counter is ' + this.counter;
  }
}

@Module({
  providers: [EagerService],
})
export class EagerModule {}
