import { Module, Injectable, Inject } from '@nestjs/common';

@Injectable()
class CoreService {
  constructor(@Inject(CoreService.name) private readonly coreService: any) {}
}

@Module({
  providers: [
    {
      provide: CoreService.name,
      useValue: 'anything',
    },
  ],
})
export class InjectSameNameModule {}
