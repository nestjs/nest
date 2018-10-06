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
  });
});
