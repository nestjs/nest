import { Module, Injectable } from '@nestjs/common';
import { GlobalService } from './global.module';

@Injectable()
export class LazyService {
  constructor(public globalService: GlobalService) {}
}

@Module({
  providers: [LazyService],
})
export class LazyModule {}
