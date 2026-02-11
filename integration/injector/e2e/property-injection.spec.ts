import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception.js';
import { Test } from '@nestjs/testing';
import { DependencyService } from '../src/properties/dependency.service.js';
import { PropertiesModule } from '../src/properties/properties.module.js';
import { PropertiesService } from '../src/properties/properties.service.js';

describe('Injector', () => {
  it('should resolve property-based dependencies', async () => {
    const builder = Test.createTestingModule({
      imports: [PropertiesModule],
    });
    const app = await builder.compile();
    const dependency = app.get(DependencyService);

    expect(app.get(PropertiesService).service).toEqual(dependency);
    expect(app.get(PropertiesService).token).toBe(true);
    expect(app.get(PropertiesService).symbolToken).toBe(true);
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

    expect(exception).toBeInstanceOf(UnknownDependenciesException);
  });
});
