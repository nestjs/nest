import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { CircularModule } from '../src/circular-structure-dynamic-module/circular.module';
import { InputService } from '../src/circular-structure-dynamic-module/input.service';

describe('Circular structure for dynamic modules', () => {
  it('should resolve circular structure with dynamic modules', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularModule.forRoot()],
    });
    const testingModule = await builder.compile();
    const inputService = testingModule.get<InputService>(InputService);

    expect(inputService).to.be.instanceof(InputService);
  });
});
