import { Test, TestingModule } from '@nestjs/testing';
import { User } from './user.model';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/sequelize';
import { Model } from 'sequelize-typescript';
import { fn } from 'sequelize';

const userArray = [
  {
    firstName: 'firstName #1',
    lastName: 'lastName #1',
  },
  {
    firstName: 'firstName #2',
    lastName: 'lastName #2',
  },
];

const oneUser = {
  firstName: 'firstName #1',
  lastName: 'lastName #1',
};

describe('UserService', () => {
  let service: UsersService;
  let model: typeof User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User),
          useValue: {
            findAll: jest.fn(() => userArray),
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            destroy: jest.fn(() => oneUser),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<typeof User, any>(getModelToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should successfully insert a user', () => {
      const user = {
        firstName: 'firstName #1',
        lastName: 'lastName #1',
      };
      expect(user).toEqual(user);
    });
  });

  describe('findAll()', () => {
    it('should return an array of users', async () => {
      const users = await service.findAll();
      expect(users).toEqual(userArray);
    });
  });

  describe('findOne()', () => {
    it('should get a single user', () => {
      const findSpy = jest.spyOn(model, 'findOne');
      expect(service.findOne('id'));
      expect(findSpy).toBeCalledWith({ where: { id: 'id' } });
    });
  });

  describe('remove()', () => {
    it('should remove a user', async () => {
      const findSpy = jest.spyOn(model, 'findOne').mockReturnValue({
        destroy: jest.fn(),
      } as any);
      const retVal = await service.remove('id');
      expect(findSpy).toBeCalledWith({ where: { id: 'id' } });
      expect(retVal).toBeUndefined();
    });
  });
});
