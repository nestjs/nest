import { Injectable, Scope, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContextIdFactory, REQUEST } from '@nestjs/core';
import { expect } from 'chai';

describe('Request Scope Bubbling', () => {
  // 1. Define the "Poison" (Request Scoped Service)
  @Injectable({ scope: Scope.REQUEST })
  class ChildService {
    // A random ID to verify uniqueness
    public readonly id = Math.random();
  }

  // 2. Define the "Victim" (Singleton that depends on Request Scoped)
  @Injectable()
  class ParentService {
    constructor(public readonly child: ChildService) {}
  }

  @Module({
    providers: [ChildService, ParentService],
  })
  class TestModule {}

  it('should downgrade a Singleton to Request-Scoped if it depends on a Request-Scoped provider', async () => {
    // 3. Bootstrap the Module (using Test.createTestingModule instead of NestFactory)
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    // 4. Simulate Request 1
    const contextId1 = ContextIdFactory.create();
    const parent1 = await moduleRef.resolve(ParentService, contextId1);

    // 5. Simulate Request 2
    const contextId2 = ContextIdFactory.create();
    const parent2 = await moduleRef.resolve(ParentService, contextId2);

    // 6. Assertions (The "Moment of Truth")

    // The Child IDs should be different (Proof of Request Scope)
    expect(parent1.child.id).to.not.equal(parent2.child.id);

    // The Parent instances should ALSO be different (Proof of Bubbling)
    // If Parent was a true Singleton, these would be equal.
    expect(parent1).to.not.equal(parent2);
  });
});
