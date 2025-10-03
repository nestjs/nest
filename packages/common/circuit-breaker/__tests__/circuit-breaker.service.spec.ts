import { Test } from '@nestjs/testing';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { CircuitBreakerState } from '../enums/circuit-breaker-state.enum';
import { CircuitBreakerException } from '../exceptions/circuit-breaker.exception';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  describe('Basic Circuit Breaker Operations', () => {
    it('should execute successfully when circuit is closed', async () => {
      const result = await service.execute('test-circuit', () => Promise.resolve('success'));
      expect(result).toBe('success');
    });

    it('should track successful calls', async () => {
      await service.execute('test-circuit', () => Promise.resolve('success'));
      
      const metrics = service.getMetrics('test-circuit');
      expect(metrics?.successfulCalls).toBe(1);
      expect(metrics?.totalCalls).toBe(1);
      expect(metrics?.failedCalls).toBe(0);
    });

    it('should track failed calls', async () => {
      try {
        await service.execute('test-circuit', () => Promise.reject(new Error('test error')));
      } catch (error) {
        // Expected to throw
      }
      
      const metrics = service.getMetrics('test-circuit');
      expect(metrics?.failedCalls).toBe(1);
      expect(metrics?.totalCalls).toBe(1);
      expect(metrics?.successfulCalls).toBe(0);
    });
  });

  describe('Circuit State Transitions', () => {
    it('should open circuit after failure threshold is reached', async () => {
      const circuitName = 'test-circuit-open';
      const options = { failureThreshold: 3, timeout: 1000 };

      // Execute failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
        } catch (error) {
          // Expected to throw
        }
      }

      const metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should reject calls when circuit is open', async () => {
      const circuitName = 'test-circuit-reject';
      const options = { failureThreshold: 2, timeout: 1000 };

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
        } catch (error) {
          // Expected to throw
        }
      }

      // Next call should be rejected with CircuitBreakerException
      await expect(
        service.execute(circuitName, () => Promise.resolve('success'), options)
      ).rejects.toThrow(CircuitBreakerException);

      const metrics = service.getMetrics(circuitName);
      expect(metrics?.rejectedCalls).toBeGreaterThan(0);
    });

    it('should transition to half-open after timeout', async () => {
      const circuitName = 'test-circuit-half-open';
      const options = { failureThreshold: 2, timeout: 100 }; // Short timeout for testing

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
        } catch (error) {
          // Expected to throw
        }
      }

      expect(service.getMetrics(circuitName)?.state).toBe(CircuitBreakerState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should transition to half-open
      try {
        await service.execute(circuitName, () => Promise.resolve('success'), options);
      } catch (error) {
        // May still be open, depending on timing
      }

      // Should allow the call through (transitions to half-open)
      const result = await service.execute(circuitName, () => Promise.resolve('recovery'), options);
      expect(result).toBe('recovery');
    });

    it('should close circuit after successful calls in half-open state', async () => {
      const circuitName = 'test-circuit-close';
      const options = { 
        failureThreshold: 2, 
        timeout: 100, 
        successThreshold: 2 
      };

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
        } catch (error) {
          // Expected to throw
        }
      }

      // Wait for timeout to transition to half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // Execute successful calls to close the circuit
      for (let i = 0; i < 2; i++) {
        await service.execute(circuitName, () => Promise.resolve('success'), options);
      }

      const metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Manual Circuit Control', () => {
    it('should manually open circuit', () => {
      const circuitName = 'manual-open-test';
      service.getCircuit(circuitName);
      
      service.openCircuit(circuitName);
      
      const metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should manually close circuit', () => {
      const circuitName = 'manual-close-test';
      service.getCircuit(circuitName);
      
      service.openCircuit(circuitName);
      service.closeCircuit(circuitName);
      
      const metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reset circuit state', () => {
      const circuitName = 'reset-test';
      
      // Create some activity
      service.execute(circuitName, () => Promise.resolve('test'));
      
      service.resetCircuit(circuitName);
      
      const metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should return null for non-existent circuit', () => {
      const metrics = service.getMetrics('non-existent');
      expect(metrics).toBeNull();
    });

    it('should return all circuit metrics', async () => {
      await service.execute('circuit-1', () => Promise.resolve('test1'));
      await service.execute('circuit-2', () => Promise.resolve('test2'));
      
      const allMetrics = service.getAllMetrics();
      expect(Object.keys(allMetrics)).toContain('circuit-1');
      expect(Object.keys(allMetrics)).toContain('circuit-2');
    });

    it('should calculate failure rate correctly', async () => {
      const circuitName = 'failure-rate-test';
      
      // 2 successes, 1 failure = 33.33% failure rate
      await service.execute(circuitName, () => Promise.resolve('success1'));
      await service.execute(circuitName, () => Promise.resolve('success2'));
      try {
        await service.execute(circuitName, () => Promise.reject(new Error('failure')));
      } catch (error) {
        // Expected
      }
      
      const metrics = service.getMetrics(circuitName);
      expect(metrics?.failureRate).toBeCloseTo(33.33, 1);
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom failure threshold', async () => {
      const circuitName = 'custom-threshold';
      const options = { failureThreshold: 1 }; // Open after 1 failure
      
      try {
        await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
      } catch (error) {
        // Expected
      }
      
      const metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should use custom isFailure function', async () => {
      const circuitName = 'custom-failure-check';
      const options = { 
        failureThreshold: 1,
        isFailure: (error: any) => error.message.includes('critical')
      };
      
      // This error should not count as failure
      try {
        await service.execute(circuitName, () => Promise.reject(new Error('non-critical error')), options);
      } catch (error) {
        // Expected
      }
      
      let metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.CLOSED);
      
      // This error should count as failure
      try {
        await service.execute(circuitName, () => Promise.reject(new Error('critical error')), options);
      } catch (error) {
        // Expected
      }
      
      metrics = service.getMetrics(circuitName);
      expect(metrics?.state).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('Callback Functions', () => {
    it('should call onOpen callback when circuit opens', async () => {
      const onOpenSpy = jest.fn();
      const circuitName = 'callback-test-open';
      const options = { 
        failureThreshold: 1,
        onOpen: onOpenSpy
      };
      
      try {
        await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
      } catch (error) {
        // Expected
      }
      
      expect(onOpenSpy).toHaveBeenCalled();
    });

    it('should call onStateChange callback', async () => {
      const onStateChangeSpy = jest.fn();
      const circuitName = 'callback-test-state';
      const options = { 
        failureThreshold: 1,
        onStateChange: onStateChangeSpy
      };
      
      try {
        await service.execute(circuitName, () => Promise.reject(new Error('failure')), options);
      } catch (error) {
        // Expected
      }
      
      expect(onStateChangeSpy).toHaveBeenCalledWith(
        CircuitBreakerState.OPEN,
        CircuitBreakerState.CLOSED
      );
    });
  });
});