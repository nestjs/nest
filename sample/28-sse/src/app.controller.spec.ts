import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('index', () => {
    it('should respond with text/html and the index.html content', () => {
      const mockResponse = {
        type: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as any;

      controller.index(mockResponse);

      expect(mockResponse.type).toHaveBeenCalledWith('text/html');
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('EventSource'),
      );
    });
  });

  describe('sse', () => {
    it('should return an Observable', () => {
      const result = controller.sse();
      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });

    it('should emit { data: { hello: "world" } } on each interval tick', async () => {
      vi.useFakeTimers();

      const promise = firstValueFrom(controller.sse());
      vi.advanceTimersByTime(1000);
      const event = await promise;

      expect(event).toEqual({ data: { hello: 'world' } });

      vi.useRealTimers();
    });
  });
});
