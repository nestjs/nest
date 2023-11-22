import { Test, TestingModule } from '@nestjs/testing';
import { CatOwnerResolver } from './cat-owner.resolver';
import { OwnersService } from '../owners/owners.service';
import { Owner, Cat } from '../graphql.schema';

describe('CatOwnerResolver', () => {
  let resolver: CatOwnerResolver;
  let ownersService: OwnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    resolver = module.get<CatOwnerResolver>(CatOwnerResolver);
    ownersService = module.get<OwnersService>(OwnersService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should resolve the owner for a cat', async () => {
    // Mock data
    const cat: Cat & { ownerId: number } = { id: 1, ownerId: 101 };
    const owner: Owner = { id: 101, name: 'John' };

    // Mock the findOneById method to return the owner data
    jest.spyOn(ownersService, 'findOneById').mockImplementation(() => owner);

    // Resolve the owner using the resolver
    const resolvedOwner = await resolver.owner(cat);

    // Verify that the resolver calls the OwnersService.findOneById method with the correct argument
    expect(ownersService.findOneById).toHaveBeenCalledWith(cat.ownerId);

    // Verify that the resolved owner matches the expected owner data
    expect(resolvedOwner).toEqual(owner);
  });
});
