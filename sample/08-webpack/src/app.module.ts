import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],   
  controllers: [AppController], 
  components: [AppService], 
})   
export class ApplicationModule {}
 