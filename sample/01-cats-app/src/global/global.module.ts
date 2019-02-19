import { Module, Global } from '@nestjs/common';
import { ConfigService } from './services/ConfigService';

@Global()
@Module({
  imports: [ConfigService],
})
export class GlobalModule {
}
