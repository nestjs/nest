import { Test, TestingModule } from '@nestjs/testing';

import { Cat } from '../graphql.schema.js';
import { CatsResolver } from './cats.resolver.js';
import { CatsService } from './cats.service.js';

import { MINIMUM_AGE, MINIMUM_AGE_ERROR } from './dto/create-cat.dto.js';

describe('CatsResolver', () => {
  let resolver: CatsResolver;
  const cat: Cat = { name: 'Cat', age: 5 };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CatsResolver,
        {
          provide: CatsService,
          useValue: {
            create: vi
              .fn()
              .mockImplementation((cat: Cat) => ({ id: 1, ...cat })),
            findAll: vi.fn().mockReturnValue([cat]),
            findOneById: vi
              .fn()
              .mockImplementation((id: number) => ({ ...cat, id })),
          },
        },
      ],
    }).compile();

    resolver = moduleRef.get<CatsResolver>(CatsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should create a new cat', async () => {
    const newCat = await resolver.create({ name: cat.name, age: cat.age });
    expect(newCat.name).toEqual(cat.name);
    expect(newCat).toEqual({ id: 1, ...cat });
  });

  it(`should fail to save if the age is under ${MINIMUM_AGE}`, async () => {
    try {
      await resolver.create({ name: cat.name, age: 0 });
    } catch (error) {
      expect(error.message).toBe(MINIMUM_AGE_ERROR);
    }
  });

  it('should return all cats', async () => {
    const cats = await resolver.getCats();
    expect(cats.length).toEqual(1);
    expect(cats[0].name).toEqual(cat.name);
  });

  it('should return a cat by id', async () => {
    const cat = await resolver.findOneById(1);
    expect(cat).toEqual({ ...cat, id: 1 });
  });
});
