import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { CatsService } from './cats.service.js';
import { Cat } from './interfaces/cat.interface.js';

const mockCat = {
  name: 'Cat #1',
  breed: 'Breed #1',
  age: 4,
};

const catsArray = [
  {
    name: 'Cat #1',
    breed: 'Breed #1',
    age: 4,
  },
  {
    name: 'Cat #2',
    breed: 'Breed #2',
    age: 2,
  },
];

describe('CatService', () => {
  let service: CatsService;
  let model: Model<Cat>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatsService,
        {
          provide: 'CAT_MODEL',
          useValue: {
            new: vi.fn().mockResolvedValue(mockCat),
            constructor: vi.fn().mockResolvedValue(mockCat),
            find: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
            exec: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CatsService);
    model = module.get<Model<Cat>>('CAT_MODEL');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all cats', async () => {
    vi.spyOn(model, 'find').mockReturnValue({
      exec: vi.fn().mockResolvedValueOnce(catsArray),
    } as any);
    const cats = await service.findAll();
    expect(cats).toEqual(catsArray);
  });

  it('should insert a new cat', async () => {
    vi.spyOn(model, 'create').mockImplementationOnce(() =>
      Promise.resolve({
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      } as any),
    );
    const newCat = await service.create({
      name: 'Cat #1',
      breed: 'Breed #1',
      age: 4,
    });
    expect(newCat).toEqual(mockCat);
  });
});
