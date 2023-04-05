import { Module, Injectable, Inject, forwardRef } from '@nestjs/common';

@Injectable()
class ServiceInjectingItself {
  constructor(private readonly coreService: ServiceInjectingItself) {}
}

@Injectable()
class ServiceInjectingItselfForward {
  constructor(
    @Inject(forwardRef(() => ServiceInjectingItself))
    private readonly coreService: ServiceInjectingItself,
  ) {}
}

@Injectable()
class ServiceInjectingItselfViaCustomToken {
  constructor(@Inject('AnotherToken') private readonly coreService: any) {}
}

@Module({
  providers: [ServiceInjectingItself],
})
export class SelfInjectionProviderModule {}

@Module({
  providers: [ServiceInjectingItselfForward],
})
export class SelfInjectionForwardProviderModule {}

@Module({
  providers: [
    ServiceInjectingItselfViaCustomToken,
    {
      provide: 'AnotherToken',
      useClass: ServiceInjectingItselfViaCustomToken,
    },
  ],
})
export class SelfInjectionProviderCustomTokenModule {}
