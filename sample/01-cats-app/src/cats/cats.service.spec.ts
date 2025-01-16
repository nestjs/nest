import { Test } from '@nestjs/testing';
import { CatsService } from './cats.service';
import { Cat } from './interfaces/cat.interface';

describe('CatsService', () => {
  let catsService: CatsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [CatsService],
    }).compile();

    catsService = moduleRef.get<CatsService>(CatsService);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const result = [
        {
          name: 'Frajola',
          age: 2,
          breed: 'Stray',
        },
      ];
      //@ts-ignore
      catsService.cats = result;

      await expect(catsService.findAll()).resolves.toBe(result);
    });
  });

  describe('create', () => {
    it('should add a new cat', async () => {
      const cat: Cat = {
        name: 'Frajola',
        age: 2,
        breed: 'Stray',
      };
      const expectedCatArray = [cat];
      //@ts-ignore
      expect(catsService.cats).toStrictEqual([]);

      catsService.create(cat);
      //@ts-ignore
      expect(catsService.cats).toStrictEqual(expectedCatArray);
    });
  });
});
