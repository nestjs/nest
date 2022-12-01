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
      jest.spyOn(catsService, 'findAll').mockImplementation(() => result);

      expect(await catsService.findAll()).toBe(result);
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

      expect(await catsService.findAll()).toStrictEqual([]);

      await catsService.create(cat);

      expect(await catsService.findAll()).toStrictEqual(expectedCatArray);
    });
  });
});
