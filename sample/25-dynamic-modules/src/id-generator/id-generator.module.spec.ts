import { Test } from '@nestjs/testing';
import { IdGenerator } from './id-generator.js';
import { IdGeneratorModule } from './id-generator.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import { OrdersService } from '../orders/orders.service.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';

describe('IdGeneratorModule', () => {
  it('should generate identifiers with the registered prefix', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [IdGeneratorModule.register({ prefix: 'usr' })],
    }).compile();

    const id = moduleRef.get(IdGenerator).generate();
    expect(id).toMatch(/^usr_[0-9a-f-]{36}$/);
  });

  it('should configure each import separately', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UsersModule, OrdersModule],
    }).compile();

    expect(moduleRef.get(UsersService).create('Kamil').id).toMatch(/^usr_/);
    expect(moduleRef.get(OrdersService).create('T-shirt').id).toMatch(/^ord_/);
  });
});
