import { Test, TestingModule } from '@nestjs/testing';
import { reduce } from 'rxjs/operators';
import { EventsGateway } from './events.gateway';

describe('EventsGateway', () => {
  let gateway: EventsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EventsGateway],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('findAll', () => {
    it('should return 3 numbers', done => {
      gateway
        .findAll({})
        .pipe(reduce((acc, item) => [...acc, item], []))
        .subscribe(results => {
          expect(results.length).toBe(3);
          results.forEach((result, index) =>
            expect(result.data).toBe(index + 1),
          );
          done();
        });
    });
  });

  describe('identity', () => {
    it('should return the same number has what was sent', async () => {
      await expect(gateway.identity(1)).resolves.toBe(1);
    });
  });
});
