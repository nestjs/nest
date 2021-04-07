import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { DependencyService } from '../src/properties/dependency.service';
import { PropertiesModule } from '../src/properties/properties.module';
import { PropertiesService } from '../src/properties/properties.service';

describe('Injector', () => {
  it('should resolve property-based dependencies', async () => {
    const builder = Test.createTestingModule({
      imports: [PropertiesModule],
    });
    const app = await builder.compile();
    const dependency = app.get(DependencyService);

    expect(app.get(PropertiesService).service).to.be.eql(dependency);
    expect(app.get(PropertiesService).token).to.be.true;
    expect(app.get(PropertiesService).symbolToken).to.be.true;
  });

  it('should throw UnknownDependenciesException when dependency is not met', async () => {
    let exception;

    try {
      const builder = Test.createTestingModule({
        providers: [
          DependencyService,
          PropertiesService,
          {
            provide: 'token',
            useValue: true,
          },
          // symbol token is missing here
        ],
      });
      const app = await builder.compile();
      app.get(DependencyService);
    } catch (e) {
      exception = e;
    }

    expect(exception).to.be.instanceOf(UnknownDependenciesException);
  });
});
