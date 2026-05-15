import { Test, TestingModule } from '@nestjs/testing';
import { MathController } from './math.controller.js';
import { MATH_SERVICE } from './math.constants.js';
import { of } from 'rxjs';

describe('MathController', () => {
  let controller: MathController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MathController],
      providers: [
        {
          provide: MATH_SERVICE,
          useValue: {
            send: vi.fn().mockReturnValue(of(15)),
          },
        },
      ],
    }).compile();

    controller = module.get<MathController>(MathController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('execute()', () => {
    it('should send sum pattern and return result', () => {
      return new Promise<void>(resolve => {
        const result = controller.execute();
        result.subscribe(value => {
          expect(value).toBe(15);
          resolve();
        });
      });
    });
  });

  describe('sum()', () => {
    it('should return sum of numbers', () => {
      expect(controller.sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should handle empty array', () => {
      expect(() => controller.sum([])).toThrow();
    });
  });
});
