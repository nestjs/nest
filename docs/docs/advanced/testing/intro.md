---
sidebar_position: 1
---

# Testing Strategies: Building Bulletproof NestJS Applications

Testing isn't optional - it's essential. Learn the testing patterns used by production NestJS applications.

## The Testing Pyramid

```
           ╱╲
          ╱E2E╲          ← Few, slow, expensive
         ╱──────╲
        ╱ Integ. ╲       ← Some, medium speed
       ╱──────────╲
      ╱    Unit     ╲    ← Many, fast, cheap
     ╱──────────────╲
```

**Distribution:**
- **70%** Unit Tests (fast, isolated)
- **20%** Integration Tests (moderate)
- **10%** E2E Tests (slow, comprehensive)

## Unit Testing

### Basic Test Setup

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findUser', () => {
    it('should return a user', async () => {
      const mockUser = { id: '1', name: 'John', email: 'john@example.com' };

      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findUser('1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ id: '1' });
    });

    it('should throw when user not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findUser('999')).rejects.toThrow('User not found');
    });
  });
});
```

### Advanced Mocking Patterns

#### Pattern 1: Mock Factory

```typescript
// test/factories/user.factory.ts
export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.datatype.uuid(),
      name: faker.name.fullName(),
      email: faker.internet.email(),
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// Usage in tests
it('should handle multiple users', () => {
  const users = UserFactory.createMany(5);
  expect(users).toHaveLength(5);
});
```

#### Pattern 2: Custom Test Module Builder

```typescript
// test/utils/test-module.builder.ts
export class TestModuleBuilder {
  static async create(options: {
    providers?: Provider[];
    controllers?: Type<any>[];
    imports?: any[];
    mocks?: Map<any, any>;
  }): Promise<TestingModule> {
    const moduleBuilder = Test.createTestingModule({
      providers: options.providers || [],
      controllers: options.controllers || [],
      imports: options.imports || [],
    });

    // Auto-mock specified dependencies
    if (options.mocks) {
      options.mocks.forEach((mockValue, token) => {
        moduleBuilder.overrideProvider(token).useValue(mockValue);
      });
    }

    return moduleBuilder.compile();
  }
}

// Usage
const module = await TestModuleBuilder.create({
  providers: [UserService],
  mocks: new Map([
    [UserRepository, { findOne: jest.fn(), save: jest.fn() }],
    [LoggerService, { log: jest.fn() }],
  ]),
});
```

#### Pattern 3: Test Doubles

```typescript
// Stub: Returns predetermined data
class StubUserRepository {
  async findOne(id: string): Promise<User> {
    return { id, name: 'Test User', email: 'test@example.com' };
  }
}

// Fake: Working implementation (in-memory)
class FakeUserRepository {
  private users: User[] = [];

  async save(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async findOne(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }
}

// Spy: Records interactions
class SpyUserRepository {
  findOneCalls: string[] = [];

  async findOne(id: string): Promise<User | null> {
    this.findOneCalls.push(id);
    return null;
  }
}

// Usage
it('should use fake repository', async () => {
  const fakeRepo = new FakeUserRepository();

  await fakeRepo.save({ id: '1', name: 'John' });
  const user = await fakeRepo.findOne('1');

  expect(user.name).toBe('John');
});
```

## Integration Testing

Test multiple components working together:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user.module';
import { UserService } from './user.service';

describe('UserService Integration', () => {
  let service: UserService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5433, // Test database
          username: 'test',
          password: 'test',
          database: 'test_db',
          entities: [User],
          synchronize: true,
        }),
        UserModule,
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    // Clean up database after each test
    await service.deleteAll();
  });

  it('should create and retrieve user', async () => {
    const userData = { name: 'John', email: 'john@example.com' };

    const created = await service.create(userData);
    expect(created.id).toBeDefined();

    const retrieved = await service.findOne(created.id);
    expect(retrieved).toMatchObject(userData);
  });

  it('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      service.create({ name: `User ${i}`, email: `user${i}@example.com` })
    );

    const users = await Promise.all(promises);

    expect(users).toHaveLength(10);
    expect(new Set(users.map(u => u.id)).size).toBe(10); // All unique IDs
  });
});
```

### Testing with In-Memory Database

```typescript
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

// Create test database
const testModule = await Test.createTestingModule({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [User, Post],
      synchronize: true,
    }),
    UserModule,
  ],
}).compile();
```

## E2E Testing

Test the entire application:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'password' });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should return 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });

    it('should return users with auth', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/users (POST)', () => {
    it('should create user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New User',
          email: 'new@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.email).toBe('new@example.com');
        });
    });

    it('should validate input', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty name
          email: 'invalid-email', // Invalid: bad email format
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('validation failed');
        });
    });
  });
});
```

## Advanced Testing Patterns

### Pattern 1: Test Fixtures

```typescript
// test/fixtures/database.fixture.ts
export class DatabaseFixture {
  constructor(private dataSource: DataSource) {}

  async seed() {
    const users = await this.dataSource.getRepository(User).save([
      { name: 'Admin', email: 'admin@example.com', role: 'admin' },
      { name: 'User', email: 'user@example.com', role: 'user' },
    ]);

    await this.dataSource.getRepository(Post).save([
      { title: 'Post 1', author: users[0] },
      { title: 'Post 2', author: users[1] },
    ]);
  }

  async clear() {
    await this.dataSource.getRepository(Post).clear();
    await this.dataSource.getRepository(User).clear();
  }
}

// Usage
beforeEach(async () => {
  await fixture.seed();
});

afterEach(async () => {
  await fixture.clear();
});
```

### Pattern 2: Custom Matchers

```typescript
// test/matchers/custom.matchers.ts
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    };
  },

  toHaveStatusCode(response: any, expected: number) {
    const pass = response.status === expected;

    return {
      pass,
      message: () =>
        `expected status ${response.status} to be ${expected}`,
    };
  },
});

// Usage
it('should validate email', () => {
  expect('test@example.com').toBeValidEmail();
  expect('invalid-email').not.toBeValidEmail();
});
```

### Pattern 3: Test Containers (Docker)

```typescript
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('UserService with Real Database', () => {
  let container: StartedTestContainer;
  let module: TestingModule;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new GenericContainer('postgres:14')
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test_db',
      })
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(5432);

    // Create test module with real database
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host,
          port,
          username: 'test',
          password: 'test',
          database: 'test_db',
          entities: [User],
          synchronize: true,
        }),
        UserModule,
      ],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
    await container.stop();
  });

  // Tests run against real PostgreSQL
});
```

## Performance Testing

```typescript
import autocannon from 'autocannon';

describe('Performance Tests', () => {
  it('should handle 1000 req/s', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/users',
      connections: 100,
      duration: 10,
      pipelining: 10,
    });

    expect(result.requests.mean).toBeGreaterThan(1000);
    expect(result.latency.p99).toBeLessThan(100); // 99th percentile < 100ms
  });
});
```

## Testing Best Practices

### ✅ DO

```typescript
// ✅ Test behavior, not implementation
it('should return user data', async () => {
  const user = await service.getUser('123');
  expect(user.name).toBe('John');
});

// ✅ Use descriptive test names
it('should throw UnauthorizedException when token is invalid', () => {
  // ...
});

// ✅ One assertion per test (when possible)
it('should create user with correct email', async () => {
  const user = await service.create({ email: 'test@example.com' });
  expect(user.email).toBe('test@example.com');
});

// ✅ Arrange, Act, Assert pattern
it('should update user', async () => {
  // Arrange
  const user = await service.create({ name: 'John' });

  // Act
  const updated = await service.update(user.id, { name: 'Jane' });

  // Assert
  expect(updated.name).toBe('Jane');
});
```

### ❌ DON'T

```typescript
// ❌ Don't test implementation details
it('should call repository.save', async () => {
  await service.createUser(data);
  expect(repository.save).toHaveBeenCalled(); // Testing implementation!
});

// ❌ Don't use production dependencies in tests
beforeEach(() => {
  // Don't connect to real database, use test database or mock
});

// ❌ Don't ignore test failures
it.skip('this test is flaky', () => {
  // Fix flaky tests, don't skip them!
});

// ❌ Don't test framework code
it('should inject dependencies', () => {
  expect(service.repository).toBeDefined(); // Testing NestJS DI!
});
```

## Code Coverage

```bash
# Run tests with coverage
npm run test:cov

# Set coverage thresholds in jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Key Takeaways

1. **Follow the testing pyramid**: Mostly unit tests, some integration, few E2E
2. **Test behavior, not implementation**: Tests should survive refactoring
3. **Use test doubles appropriately**: Stubs, fakes, mocks, spies
4. **Integration tests catch real issues**: Test with real databases (in CI/CD)
5. **E2E tests are expensive**: Keep them focused and minimal

## Next Steps

- [Unit Testing](/docs/advanced/testing/unit-testing) - Deep dive into unit tests
- [Integration Testing](/docs/advanced/testing/integration-testing) - Test component interaction
- [E2E Testing](/docs/advanced/testing/e2e-testing) - Full application testing

---

**Test with confidence, ship with peace of mind** 🧪
