import { Controller, Get } from '@nestjs/common';
import { LazyModuleLoader } from '@nestjs/core';

@Controller('lazy')
export class LazyController {
  constructor(private lazyLoadModule: LazyModuleLoader) {}

  @Get('transient')
  async exec() {
    const { TransientLazyModule } = await import('./transient.module');
    const moduleRef = await this.lazyLoadModule.load(() => TransientLazyModule);

    const { TransientService } = await import('./transient.service');
    const _service = await moduleRef.resolve(TransientService);

    return _service.eager();
  }
}
