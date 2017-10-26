import { CatsModule } from './cats/cats.module';
import { Module } from '';

@Module({
  modules: [CatsModule],
})
export class ApplicationModule {}
