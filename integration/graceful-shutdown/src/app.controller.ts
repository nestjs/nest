import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('slow')
  async slow() {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
    return 'ok';
  }
}
