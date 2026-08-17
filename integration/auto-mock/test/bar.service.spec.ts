import { Test } from '@nestjs/testing';
import { BarService } from '../src/bar.service.js';
import { FooService } from '../src/foo.service.js';

describe('Auto-Mocking Bar Deps', () => {
  let service: BarService;
  let fooService: FooService;
  const stub = vi.fn();
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [BarService],
    })
      .useMocker(() => ({ foo: stub }))
      .compile();
    service = moduleRef.get(BarService);
    fooService = moduleRef.get(FooService);
  });

  it('should be defined', () => {
    expect(service).not.toBeUndefined();
    expect(fooService).not.toBeUndefined();
  });
  it('should call bar.bar', () => {
    service.bar();
    expect(stub).toHaveBeenCalled();
  });
});

describe('Auto-Mocking with token in factory', () => {
  it('can mock the dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [BarService],
    })
      .useMocker(token => {
        if (token === FooService) {
          return { foo: vi.fn() };
        }
      })
      .compile();
    const service = moduleRef.get(BarService);
    const fooServ = moduleRef.get<{ foo: ReturnType<typeof vi.fn> }>(
      FooService as any,
    );
    service.bar();
    expect(fooServ.foo).toHaveBeenCalled();
  });
  it('cannot mock the dependencies', async () => {
    const moduleRef = Test.createTestingModule({
      providers: [BarService],
    }).useMocker(token => {
      if (token === FooService.name + 'something that fails the token') {
        return { foo: vi.fn() };
      }
    }).compile;
    await expect(moduleRef()).rejects.toThrow();
  });
});
