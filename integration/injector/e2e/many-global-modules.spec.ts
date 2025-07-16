import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Global, Inject, Injectable, Module, Scope } from '@nestjs/common';

@Global()
@Module({})
export class GlobalModule1 {}

@Global()
@Module({})
export class GlobalModule2 {}

@Global()
@Module({})
export class GlobalModule3 {}

@Global()
@Module({})
export class GlobalModule4 {}

@Global()
@Module({})
export class GlobalModule5 {}

@Global()
@Module({})
export class GlobalModule6 {}

@Global()
@Module({})
export class GlobalModule7 {}

@Global()
@Module({})
export class GlobalModule8 {}

@Global()
@Module({})
export class GlobalModule9 {}

@Global()
@Module({})
export class GlobalModule10 {}

@Injectable()
class TransientProvider {}

@Injectable()
class RequestProvider {}

@Injectable()
export class Dependant {
  constructor(
    private readonly transientProvider: TransientProvider,

    @Inject(RequestProvider)
    private readonly requestProvider: RequestProvider,
  ) {}

  public checkDependencies() {
    expect(this.transientProvider).to.be.instanceOf(TransientProvider);
    expect(this.requestProvider).to.be.instanceOf(RequestProvider);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: TransientProvider,
      scope: Scope.TRANSIENT,
      useClass: TransientProvider,
    },
    {
      provide: Dependant,
      scope: Scope.DEFAULT,
      useClass: Dependant,
    },
  ],
})
export class GlobalModuleWithTransientProviderAndDependant {}

@Global()
@Module({
  providers: [
    {
      provide: RequestProvider,
      scope: Scope.REQUEST,
      useFactory: () => {
        return new RequestProvider();
      },
    },
  ],
  exports: [RequestProvider],
})
export class GlobalModuleWithRequestProvider {}

@Module({
  imports: [
    GlobalModule1,
    GlobalModule2,
    GlobalModule3,
    GlobalModule4,
    GlobalModule5,
    GlobalModule6,
    GlobalModule7,
    GlobalModule8,
    GlobalModule9,
    GlobalModule10,
    GlobalModuleWithTransientProviderAndDependant,
    GlobalModuleWithRequestProvider,
  ],
})
export class AppModule {}

describe('Many global modules', () => {
  it('should inject request-scoped useFactory provider and transient-scoped useClass provider from different modules', async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });
    const moduleRef = await moduleBuilder.compile();

    const dependant = await moduleRef.resolve(Dependant);
    const checkDependenciesSpy = sinon.spy(dependant, 'checkDependencies');
    dependant.checkDependencies();

    expect(checkDependenciesSpy.called).to.be.true;
  });
});
