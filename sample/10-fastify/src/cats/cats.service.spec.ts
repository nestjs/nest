import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';
import { CreateCatDto } from './dto/create-cat.dto';

describe('CatsService', () => {
  let service: CatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatsService],
    }).compile();

    service = module.get<CatsService>(CatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create and findAll', () => {
    it('should create a new cat, assign an ID, and return all cats', () => {
      const catDto: CreateCatDto = { name: 'Milo', age: 2, breed: 'Tabby' };

      const createdCat = service.create(catDto);

      expect(createdCat.id).toBe(1);
      expect(createdCat.name).toBe('Milo');

      const allCats = service.findAll();

      expect(allCats).toHaveLength(1);
      expect(allCats).toEqual([createdCat]);

      const catDto2: CreateCatDto = { name: 'Luna', age: 1, breed: 'Siamese' };
      const createdCat2 = service.create(catDto2);
      expect(createdCat2.id).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return a single cat by its id', () => {
      const catDto: CreateCatDto = { name: 'Luna', age: 1, breed: 'Siamese' };
      const createdCat = service.create(catDto);

      const foundCat = service.findOne(1);

      expect(foundCat).toBeDefined();
      expect(foundCat).toEqual(createdCat);
    });

    it('should return undefined if cat is not found', () => {
      const foundCat = service.findOne(999);
      expect(foundCat).toBeUndefined();
    });
  });
});