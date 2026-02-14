import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('findOne', () => {
    it('should return a UserEntity', () => {
      const result = appController.findOne();
      expect(result).toBeInstanceOf(UserEntity);
    });

    it('should return user with correct properties', () => {
      const result = appController.findOne();
      expect(result.id).toBe(1);
      expect(result.firstName).toBe('Kamil');
      expect(result.lastName).toBe('Mysliwiec');
      expect(result.password).toBe('password');
    });

    it('should return user with role entity', () => {
      const result = appController.findOne();
      expect(result.role).toBeInstanceOf(RoleEntity);
      expect(result.role.id).toBe(1);
      expect(result.role.name).toBe('admin');
    });
  });
});
