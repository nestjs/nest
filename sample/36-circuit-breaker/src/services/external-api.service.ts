import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CircuitBreaker } from '../../../../packages/common/circuit-breaker';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExternalApiService {
  constructor(private readonly httpService: HttpService) {}

  @CircuitBreaker({ 
    name: 'external-api',
    failureThreshold: 3,
    timeout: 30000,
    onOpen: () => console.log('🔴 External API circuit breaker opened'),
    onClose: () => console.log('🟢 External API circuit breaker closed'),
    onStateChange: (newState, oldState) => 
      console.log(`📊 External API circuit breaker: ${oldState} → ${newState}`)
  })
  async callExternalApi(): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://jsonplaceholder.typicode.com/posts/1')
      );
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`External API call failed: ${error.message}`);
    }
  }

  @CircuitBreaker({ 
    name: 'external-api-fail',
    failureThreshold: 2,
    timeout: 15000 
  })
  async callFailingApi(): Promise<any> {
    // Simulate external API failure
    throw new Error('External service is unavailable');
  }

  @CircuitBreaker({ 
    name: 'external-api-slow',
    failureThreshold: 3,
    timeout: 20000 
  })
  async callSlowApi(): Promise<any> {
    // Simulate slow external API
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Randomly fail to demonstrate circuit breaker
    if (Math.random() < 0.6) {
      throw new Error('Slow API timeout or failure');
    }
    
    return {
      success: true,
      message: 'Slow API responded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}