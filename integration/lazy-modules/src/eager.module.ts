import { Module, Injectable } from '@nestjs/common';
import { GlobalService } from './global.module';

@Injectable()
export class EagerService {
  constructor(public globalService: GlobalService) {}
}

@Module({
  providers: [EagerService],
})
export class EagerModule {}
