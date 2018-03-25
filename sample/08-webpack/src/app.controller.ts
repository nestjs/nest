import { Get, Controller } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}
  
	@Get()
	root(): string { 
    return this.service.get();
  }
 
  @Get('aha')
	rootxd(): string { 
    return 'Hellso World!';
  } 

  @Get('ssg')
	xd(): string { 
    return 'Hellso World!';
  } 
}
 