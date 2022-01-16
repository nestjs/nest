import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';
import { Model } from 'mongoose';

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
            new: jest.fn().mockResolvedValue(mockCat),
            constructor: jest.fn().mockResolvedValue(mockCat),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
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
    jest.spyOn(model, 'find').mockReturnValue({
      exec: jest.fn().mockResolvedValueOnce(catsArray),
    } as any);
    const cats = await service.findAll();
    expect(cats).toEqual(catsArray);
  });

  it('should insert a new cat', async () => {
    jest.spyOn(model, 'create').mockImplementationOnce(() =>
      Promise.resolve({
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      }),
    );
    const newCat = await service.create({
      name: 'Cat #1',
      breed: 'Breed #1',
      age: 4,
    });
    expect(newCat).toEqual(mockCat);
  });
});
