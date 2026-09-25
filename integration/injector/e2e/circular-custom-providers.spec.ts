import { Test } from '@nestjs/testing';

import { Controller, Inject, Injectable, Module } from '@nestjs/common';

class B {}

const ALIAS = 'ALIAS';

@Injectable()
class Third {
  constructor(@Inject(ALIAS) first: object) {}
}

@Injectable()
class Second {
  constructor(third: Third) {}
}

@Injectable()
class First {
  constructor(second: Second) {}
}

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
    const builder = Test.createTestingModule({
      imports: [AppModule],
    });
    await expect(builder.compile()).rejects.toThrow(
      'A circular dependency has been detected inside "A". Please, make sure that each side of a bidirectional relationships are decorated with "forwardRef()". Note that circular relationships between custom providers (e.g., factories) are not supported since functions cannot be called more than once.',
    );
  });

  it('should throw an exception (2 factories)', async () => {
    const builder = Test.createTestingModule({
      providers: [
        { provide: 'ABC', useFactory: () => ({}), inject: ['DEF'] },
        { provide: 'DEF', useFactory: () => ({}), inject: ['ABC'] },
      ],
    });
    await expect(builder.compile()).rejects.toThrow(
      'A circular dependency has been detected inside "ABC"',
    );
  });

  it('should throw an exception (3 factories)', async () => {
    const builder = Test.createTestingModule({
      providers: [
        { provide: 'ABC', useFactory: () => ({}), inject: ['DEF'] },
        { provide: 'DEF', useFactory: () => ({}), inject: ['GHI'] },
        { provide: 'GHI', useFactory: () => ({}), inject: ['ABC'] },
      ],
    });
    await expect(builder.compile()).rejects.toThrow(
      'A circular dependency has been detected inside "ABC"',
    );
  });

  it('should throw an exception (3 classes closed by a useExisting alias)', async () => {
    const builder = Test.createTestingModule({
      providers: [First, Second, Third, { provide: ALIAS, useExisting: First }],
    });
    await expect(builder.compile()).rejects.toThrow(
      'A circular dependency has been detected',
    );
  });

  it('should not throw when two providers share a dependency', async () => {
    const builder = Test.createTestingModule({
      providers: [
        { provide: 'TOP', useFactory: () => ({}), inject: ['LEFT', 'RIGHT'] },
        { provide: 'LEFT', useFactory: () => ({}), inject: ['BOTTOM'] },
        { provide: 'RIGHT', useFactory: () => ({}), inject: ['BOTTOM'] },
        { provide: 'BOTTOM', useFactory: () => ({}) },
      ],
    });
    await expect(builder.compile()).resolves.toBeDefined();
  });
});
