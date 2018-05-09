import { expect } from 'chai';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { CircularModule } from '../src/circular/circular.module';
import { InputService } from '../src/circular/input.service';
import { CircularService } from '../src/circular/circular.service';

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
