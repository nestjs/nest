import { Test, TestingModule } from '@nestjs/testing';
import { Owner } from '../graphql.schema';
import { OwnersService } from './owners.service';

describe('OwnersService', () => {
  let service: OwnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OwnersService],
    }).compile();

    service = module.get<OwnersService>(OwnersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneById', () => {
    it('should return an owner if exists', () => {
      const ownerId = 1;
      const expectedOwner: Owner = { id: 1, name: 'Jon', age: 5 };

      const result = service.findOneById(ownerId);

      expect(result).toEqual(expectedOwner);
    });

    it('should return undefined if owner does not exist', () => {
      const ownerId = 9999;

      const result = service.findOneById(ownerId);

      expect(result).toBeUndefined();
    });
  });
});
