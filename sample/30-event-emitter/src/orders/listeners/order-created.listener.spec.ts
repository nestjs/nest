import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderCreatedListener } from './order-created.listener';

let app: TestingModule;
let emitter: EventEmitter2;

beforeEach(async () => {
  app = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot()],
    providers: [OrderCreatedListener],
  }).compile();

  await app.init();
  emitter = app.get(EventEmitter2);
});

describe('handleOrderCreatedEvent', () => {
  it('handle event', async () => {
    const results = await emitter.emitAsync('order.created');
    expect(results).toEqual(['handled event "order.created"']);
  });
});
