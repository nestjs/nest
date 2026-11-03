import { Body, Controller, Module, Post } from '@nestjs/common';

@Controller()
export class EchoController {
  @Post('echo')
  echo(@Body() body: unknown) {
    return typeof body === 'string' ? body : JSON.stringify(body ?? null);
  }
}

@Module({ controllers: [EchoController] })
export class BodyParsersModule {}
