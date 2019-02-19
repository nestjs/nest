import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';
import { GlobalModule } from './global/global.module';

@Module({
  imports: [GlobalModule, CatsModule],
})
export class ApplicationModule {}
