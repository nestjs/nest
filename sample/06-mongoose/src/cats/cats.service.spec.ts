import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model, Types } from 'mongoose';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { Cat } from './schemas/cat.schema';

const catModelMock = {
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
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

  describe('create', () => {
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

  describe('findAll', () => {
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

  describe('findOne', () => {
    it('should return one cat', async () => {
      const mockedCat = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      model.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCat),
      } as any);

      const id = new Types.ObjectId().toString();
      const result = await service.findOne(id);

      expect(result).toEqual(mockedCat);
      expect(model.findOne).toHaveBeenCalledWith({ _id: id });
    });
  });

  describe('update', () => {
    it('should update a cat', async () => {
      const mockedCat = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      model.findByIdAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCat),
      } as any);

      const id = new Types.ObjectId().toString();
      const updateCatDto = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      const result = await service.update(id, updateCatDto);

      expect(result).toEqual(mockedCat);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        { _id: id },
        updateCatDto,
        { new: true },
      );
    });
  });

  describe('delete', () => {
    it('should delete a cat', async () => {
      const mockedCat = {
        name: 'Cat #1',
        breed: 'Breed #1',
        age: 4,
      };
      model.findByIdAndDelete.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockedCat),
      } as any);

      const id = new Types.ObjectId().toString();
      const result = await service.delete(id);

      expect(result).toEqual(mockedCat);
      expect(model.findByIdAndDelete).toHaveBeenCalledWith({ _id: id });
    });
  });
});
