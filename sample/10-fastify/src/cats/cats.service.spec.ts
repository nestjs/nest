import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service.js';

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

  describe('create()', () => {
    it('should add a cat to the list', () => {
      const cat = { name: 'Whiskers', age: 3, breed: 'Persian' };
      service.create(cat);

      expect(service.findAll()).toContainEqual(cat);
    });
  });

  describe('findAll()', () => {
    it('should return an empty array initially', () => {
      expect(service.findAll()).toEqual([]);
    });

    it('should return all created cats', () => {
      const cat1 = { name: 'Whiskers', age: 3, breed: 'Persian' };
      const cat2 = { name: 'Luna', age: 2, breed: 'Siamese' };

      service.create(cat1);
      service.create(cat2);

      expect(service.findAll()).toHaveLength(2);
      expect(service.findAll()).toEqual(expect.arrayContaining([cat1, cat2]));
    });
  });
});
