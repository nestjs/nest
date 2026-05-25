import { Test, TestingModule } from '@nestjs/testing';
import { Cat, Owner } from '../graphql.schema.js';
import { OwnersService } from '../owners/owners.service.js';
import { CatOwnerResolver } from './cat-owner.resolver.js';

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
            findOneById: vi.fn(),
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

    vi.spyOn(ownersService, 'findOneById').mockImplementation(() => owner);

    const resolvedOwner = await resolver.owner(cat);

    expect(ownersService.findOneById).toHaveBeenCalledWith(cat.ownerId);
    expect(resolvedOwner).toEqual(owner);
  });
});
