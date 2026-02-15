import { Test } from '@nestjs/testing';
import { CircularModule } from '../src/circular/circular.module.js';
import { CircularService } from '../src/circular/circular.service.js';
import { InputService } from '../src/circular/input.service.js';

describe('Circular dependency', () => {
  it('should resolve circular dependency between providers', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularModule],
    });
    const testingModule = await builder.compile();
    const inputService = testingModule.get<InputService>(InputService);
    const circularService = testingModule.get<CircularService>(CircularService);

    expect(inputService.service).toEqual(circularService);
    expect(circularService.service).toEqual(inputService);
  });
});
