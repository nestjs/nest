import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import { CatsService } from './cats.service';
import { Cat } from './schemas/cat.schema';
import { CreateCatDto } from './dto/create-cat.dto';

const catModelMock = {
  create: jest.fn(),
  find: jest.fn(),
};

describe('CatsService', () => {
  let service: CatsService;
  let model: jest.Mocked<Model<Cat>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatsService,
        {
          provide: getModelToken('Cat'),
          useValue: catModelMock,
        },
      ],
    }).compile();

    service = module.get(CatsService);
    model = module.get(getModelToken('Cat'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should insert a new cat', async () => {
      const mockedCat: CreateCatDto = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      model.create.mockResolvedValueOnce(mockedCat as any);

      const createCatDto = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      const result = await service.create(createCatDto);

      expect(result).toEqual(mockedCat);
      expect(model.create).toHaveBeenCalledWith(createCatDto);
    });
  });

  describe('findAll()', () => {
    it('should return all cats', async () => {
      const mockedCats = [
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
      model.find.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCats),
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(mockedCats);
      expect(model.find).toHaveBeenCalled();
    });
  });
});
