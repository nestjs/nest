import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { CircularModule } from '../src/circular-modules/circular.module';
import { CircularService } from '../src/circular-modules/circular.service';
import { InputModule } from '../src/circular-modules/input.module';
import { InputService } from '../src/circular-modules/input.service';

describe('Circular dependency (modules)', () => {
  it('should resolve circular dependency between providers', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularModule, InputModule],
    });
    const testingModule = await builder.compile();
    const inputService = testingModule.get<InputService>(InputService);
    const circularService = testingModule.get<CircularService>(CircularService);

    expect(inputService.service).to.be.eql(circularService);
    expect(circularService.service).to.be.eql(inputService);
  });
});
