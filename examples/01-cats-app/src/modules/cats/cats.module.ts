import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { Module } from '';

@Module({
    controllers: [CatsController],
    components: [CatsService],
})
export class CatsModule {}
