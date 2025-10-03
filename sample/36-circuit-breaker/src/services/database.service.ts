import { Injectable } from '@nestjs/common';
import { CircuitBreaker } from '../../../../packages/common/circuit-breaker';

// Simulated user interface
interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

@Injectable()
export class DatabaseService {
  private users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() },
  ];

  private shouldSimulateFailure = false;

  @CircuitBreaker({ 
    name: 'database-read',
    failureThreshold: 4,
    timeout: 45000,
    timeWindow: 120000,
  })
  async findAllUsers(): Promise<User[]> {
    if (this.shouldSimulateFailure) {
      throw new Error('Database connection failed');
    }

    // Simulate database query delay
    await this.simulateLatency(100, 500);
    return [...this.users];
  }

  @CircuitBreaker({ 
    name: 'database-write',
    failureThreshold: 3,
    timeout: 30000,
  })
  async createUser(userData: Partial<User>): Promise<User> {
    if (this.shouldSimulateFailure) {
      throw new Error('Database write operation failed');
    }

    await this.simulateLatency(150, 300);

    const newUser: User = {
      id: this.users.length + 1,
      name: userData.name || 'Unknown',
      email: userData.email || 'unknown@example.com',
      createdAt: new Date(),
    };

    this.users.push(newUser);
    return newUser;
  }

  @CircuitBreaker({ 
    name: 'database-delete',
    failureThreshold: 2,
    timeout: 20000,
  })
  async deleteUser(id: number): Promise<boolean> {
    if (this.shouldSimulateFailure) {
      throw new Error('Database delete operation failed');
    }

    await this.simulateLatency(50, 200);

    const userIndex = this.users.findIndex(user => user.id === id);
    if (userIndex === -1) {
      throw new Error(`User with id ${id} not found`);
    }

    this.users.splice(userIndex, 1);
    return true;
  }

  // Method to toggle failure simulation for testing
  toggleFailureSimulation(): void {
    this.shouldSimulateFailure = !this.shouldSimulateFailure;
  }

  getFailureSimulationStatus(): boolean {
    return this.shouldSimulateFailure;
  }

  private async simulateLatency(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => {
      // Use process.nextTick for Node.js environment
      const timer = setInterval(() => {
        clearInterval(timer);
        resolve();
      }, delay);
    });
  }
}