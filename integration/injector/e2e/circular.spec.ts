import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { CircularModule } from '../src/circular/circular.module';
import { CircularService } from '../src/circular/circular.service';
import { InputService } from '../src/circular/input.service';

describe('Circular dependency', () => {
  it('should resolve circular dependency between providers', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularModule],
    });
    const testingModule = await builder.compile();
    const inputService = testingModule.get<InputService>(InputService);
    const circularService = testingModule.get<CircularService>(CircularService);

    expect(inputService.service).to.be.eql(circularService);
    expect(circularService.service).to.be.eql(inputService);
  });
});
