import { Module, Injectable } from '@nestjs/common';
import { GlobalService } from './global.module.js';

@Injectable()
export class LazyService {
  constructor(public globalService: GlobalService) {}
}

@Module({
  providers: [LazyService],
})
export class LazyModule {}
