import { Test, TestingModule } from '@nestjs/testing';
import { User } from './models/user.model.js';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';

const usersServiceMock = {
  findById: vi.fn((id: number): User => {
    return { id, name: 'Mocked User' };
  }),
};

describe('UsersResolver', () => {
  let resolver: UsersResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    resolver = module.get<UsersResolver>(UsersResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should query a user by its id', () => {
    const result = resolver.getUser(1);
    expect(result.id).toEqual(1);
  });

  it('should resolve a reference', () => {
    const result = resolver.resolveReference({ __typename: 'User', id: 1 });
    expect(result.id).toEqual(1);
  });
});
