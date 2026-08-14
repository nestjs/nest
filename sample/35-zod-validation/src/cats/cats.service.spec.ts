import { Test } from '@nestjs/testing';
import { CatsService } from './cats.service.js';
import { Cat } from './interfaces/cat.interface.js';

describe('CatsService', () => {
  let catsService: CatsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CatsService],
    }).compile();

    catsService = moduleRef.get<CatsService>(CatsService);
  });

  describe('findAll', () => {
    it('should return an array of cats', () => {
      const result: Cat[] = [
        {
          name: 'Frajola',
          age: 2,
          breed: 'Stray',
        },
      ];
      //@ts-ignore
      catsService.cats = result;

      expect(catsService.findAll()).toBe(result);
    });
  });

  describe('create', () => {
    it('should add a new cat', () => {
      const cat: Cat = {
        name: 'Frajola',
        age: 2,
        breed: 'Stray',
      };

      //@ts-ignore
      expect(catsService.cats).toStrictEqual([]);

      catsService.create(cat);

      //@ts-ignore
      expect(catsService.cats).toStrictEqual([cat]);
    });
  });
});
