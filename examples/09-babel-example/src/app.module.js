import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';
import { CatsController } from './cats/cats.controller';

@Module({
    imports: [CatsModule],
})
export class ApplicationModule {}