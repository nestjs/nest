import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';

const catsServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('CatsController', () => {
  let controller: CatsController;
  let service: jest.Mocked<CatsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatsController],
      providers: [
        {
          provide: CatsService,
          useValue: catsServiceMock,
        },
      ],
    }).compile();

    controller = module.get(CatsController);
    service = module.get(CatsService);
  });

  describe('create', () => {
    it('should create a new cat', async () => {
      const mockedCat = {
        _id: new Types.ObjectId(),
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      service.create.mockResolvedValueOnce(mockedCat);

      const createCatDto: CreateCatDto = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      const result = await controller.create(createCatDto);

      expect(result).toEqual(mockedCat);
      expect(service.create).toHaveBeenCalledWith(createCatDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const mockedCats = [
        {
          _id: new Types.ObjectId(),
          name: 'Cat #1',
          breed: 'Bread #1',
          age: 4,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Cat #2',
          breed: 'Breed #2',
          age: 3,
        },
        {
          _id: new Types.ObjectId(),
          name: 'Cat #3',
          breed: 'Breed #3',
          age: 2,
        },
      ];
      service.findAll.mockResolvedValueOnce(mockedCats);

      const result = await controller.findAll();

      expect(result).toEqual(mockedCats);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single cat', async () => {
      const mockedCat = {
        _id: new Types.ObjectId(),
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      service.findOne.mockResolvedValueOnce(mockedCat);

      const id = new Types.ObjectId().toString();
      const result = await controller.findOne(id);

      expect(result).toEqual(mockedCat);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should update a single cat', async () => {
      const mockedCat = {
        _id: new Types.ObjectId(),
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      service.update.mockResolvedValueOnce(mockedCat);

      const id = new Types.ObjectId().toString();
      const updateCatDto: CreateCatDto = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      const result = await controller.update(id, updateCatDto);

      expect(result).toEqual(mockedCat);
      expect(service.update).toHaveBeenCalledWith(id, updateCatDto);
    });
  });

  describe('delete', () => {
    it('should delete a single cat', async () => {
      const mockedCat = {
        _id: new Types.ObjectId(),
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      service.delete.mockResolvedValueOnce(mockedCat);

      const id = new Types.ObjectId().toString();
      const result = await controller.delete(id);

      expect(result).toEqual(mockedCat);
      expect(service.delete).toHaveBeenCalledWith(id);
    });
  });
});
