import { Test } from '@nestjs/testing';
import { expect } from 'chai';

import { Controller, Injectable, Module } from '@nestjs/common';

class B {}

@Injectable()
class A {
  constructor(b: B) {}
}

@Injectable()
class BImpl {
  constructor(a: A) {}
}

@Controller()
class AppController {
  constructor(a: A) {}
}

@Module({
  imports: [],
  controllers: [AppController],
  providers: [A, { provide: B, useClass: BImpl }],
})
export class AppModule {}

describe('Circular custom providers', () => {
  it('should throw an exception (useClass + regular provider)', async () => {
    try {
      const builder = Test.createTestingModule({
        imports: [AppModule],
      });
      await builder.compile();

      expect(true).to.be.eql(false);
    } catch (err) {
      expect(err.message).to.be.eql(
        'A circular dependency has been detected inside "A". Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()". Note that circular relationships between custom providers (e.g., factories) are not supported since functions cannot be called more than once.',
      );
    }
  });

  it('should throw an exception (2 factories)', async () => {
    try {
      const builder = Test.createTestingModule({
        providers: [
          { provide: 'ABC', useFactory: () => ({}), inject: ['DEF'] },
          { provide: 'DEF', useFactory: () => ({}), inject: ['ABC'] },
        ],
      });
      await builder.compile();

      expect(true).to.be.eql(false);
    } catch (err) {
      expect(err.message).to.be.eql(
        'A circular dependency has been detected inside "ABC". Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()". Note that circular relationships between custom providers (e.g., factories) are not supported since functions cannot be called more than once.',
      );
    }
  });
});
