import { Module, Injectable, Global } from '@nestjs/common';

@Injectable()
export class GlobalService {
  constructor() {}
}

@Global()
@Module({
  providers: [GlobalService],
  exports: [GlobalService],
})
export class GlobalModule {}
