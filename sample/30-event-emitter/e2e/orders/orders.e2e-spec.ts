import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { OrderCreatedListener } from '../../src/orders/listeners/order-created.listener';

describe('EventEmitter Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/orders (POST) should create an order', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ name: 'Order #3', description: 'New test order' })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.name).toBe('Order #3');
        expect(res.body.description).toBe('New test order');
      });
  });

  it('/orders (POST) should trigger event listener', async () => {
    const listener = app.get(OrderCreatedListener);
    const spy = jest.spyOn(listener, 'handleOrderCreatedEvent');

    await request(app.getHttpServer())
      .post('/orders')
      .send({ name: 'Order #4', description: 'Event test order' })
      .expect(201);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Order #4',
        description: 'Event test order',
      }),
    );

    spy.mockRestore();
  });
});
