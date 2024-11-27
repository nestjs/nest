import { Test, TestingModule } from '@nestjs/testing';
import { Cat, Owner } from '../graphql.schema';
import { OwnersService } from '../owners/owners.service';
import { CatOwnerResolver } from './cat-owner.resolver';

describe('CatOwnerResolver', () => {
  let resolver: CatOwnerResolver;
  let ownersService: OwnersService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CatOwnerResolver,
        {
          provide: OwnersService,
          useValue: {
            findOneById: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = moduleRef.get(CatOwnerResolver);
    ownersService = moduleRef.get(OwnersService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve the owner for a cat', async () => {
    const cat: Cat & { ownerId: number } = { id: 1, ownerId: 101 };
    const owner: Owner = { id: 101, name: 'Kambale' };

    jest.spyOn(ownersService, 'findOneById').mockImplementation(() => owner);

    const resolvedOwner = await resolver.owner(cat);

    expect(ownersService.findOneById).toHaveBeenCalledWith(cat.ownerId);
    expect(resolvedOwner).toEqual(owner);
  });
});
