import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { CircularService } from '../src/circular-properties/circular.service';
import { CircularPropertiesModule } from '../src/circular-properties/circular-properties.module';
import { InputService } from '../src/circular-properties/input.service';
import { InputPropertiesModule } from '../src/circular-properties/input-properties.module';

describe('Circular properties dependency (modules)', () => {
  it('should resolve circular dependency between providers', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularPropertiesModule, InputPropertiesModule],
    });
    const testingModule = await builder.compile();
    const inputService = testingModule.get<InputService>(InputService);
    const circularService = testingModule.get<CircularService>(CircularService);

    expect(inputService.service).to.be.eql(circularService);
    expect(circularService.service).to.be.eql(inputService);
  });
});
