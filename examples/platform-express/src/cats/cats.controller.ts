import { Controller, Get } from '@nest/server';

@Controller('cats')
export class CatsController {
  @Get()
  getRoot() {}
}
