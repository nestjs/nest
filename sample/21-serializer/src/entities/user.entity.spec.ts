import { plainToInstance, instanceToPlain } from 'class-transformer';
import { UserEntity } from './user.entity';
import { RoleEntity } from './role.entity';

describe('UserEntity', () => {
  describe('serialization', () => {
    it('should exclude password when serialized', () => {
      const user = new UserEntity({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        password: 'secret',
        role: new RoleEntity({ id: 1, name: 'admin' }),
      });

      const plain = instanceToPlain(user);
      expect(plain).not.toHaveProperty('password');
    });

    it('should expose fullName computed property', () => {
      const user = new UserEntity({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        password: 'secret',
        role: new RoleEntity({ id: 1, name: 'admin' }),
      });

      const plain = instanceToPlain(user);
      expect(plain).toHaveProperty('fullName');
      expect(plain['fullName']).toBe('John Doe');
    });

    it('should transform role to role name string', () => {
      const user = new UserEntity({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        password: 'secret',
        role: new RoleEntity({ id: 1, name: 'admin' }),
      });

      const plain = instanceToPlain(user);
      expect(plain['role']).toBe('admin');
      expect(typeof plain['role']).toBe('string');
    });

    it('should include id, firstName, and lastName', () => {
      const user = new UserEntity({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        password: 'secret',
        role: new RoleEntity({ id: 1, name: 'admin' }),
      });

      const plain = instanceToPlain(user);
      expect(plain).toHaveProperty('id', 1);
      expect(plain).toHaveProperty('firstName', 'John');
      expect(plain).toHaveProperty('lastName', 'Doe');
    });
  });

  describe('fullName getter', () => {
    it('should concatenate firstName and lastName', () => {
      const user = new UserEntity({
        id: 1,
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'secret',
        role: new RoleEntity({ id: 1, name: 'user' }),
      });

      expect(user.fullName).toBe('Jane Smith');
    });
  });

  describe('deserialization', () => {
    it('should create UserEntity from plain object', () => {
      const plain = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        password: 'secret',
      };

      const user = plainToInstance(UserEntity, plain);
      expect(user).toBeInstanceOf(UserEntity);
      expect(user.id).toBe(1);
      expect(user.firstName).toBe('John');
    });
  });
});
