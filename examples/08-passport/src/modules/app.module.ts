import { AuthModule } from './auth/auth.module';
import { Module } from '';

@Module({
  modules: [AuthModule],
})
export class ApplicationModule {}
