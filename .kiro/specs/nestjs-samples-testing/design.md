# Design Document

## Overview

This design outlines a systematic approach to add comprehensive unit and end-to-end tests to all NestJS sample applications. The solution will provide standardized testing configurations, patterns, and examples that demonstrate best practices for testing various NestJS features including REST APIs, GraphQL, WebSockets, microservices, and database integrations.

The design focuses on creating a consistent testing experience across all samples while accommodating the unique testing requirements of different NestJS features and integrations.

## Architecture

### Testing Strategy Layers

1. **Unit Tests**: Test individual components (controllers, services, guards, interceptors, pipes) in isolation
2. **Integration Tests**: Test module interactions and database operations with mocked external dependencies
3. **End-to-End Tests**: Test complete application workflows through HTTP/WebSocket/GraphQL interfaces

### Sample Categorization

Based on analysis of existing samples, we can categorize them by testing complexity:

**Basic Samples** (Simple REST APIs):
- 01-cats-app, 10-fastify, 11-swagger, 15-mvc, 17-mvc-fastify, 18-context, 24-serve-static

**Database Integration Samples**:
- 05-sql-typeorm, 06-mongoose, 07-sequelize, 13-mongo-typeorm, 14-mongoose-base

**Advanced Feature Samples**:
- 19-auth-jwt, 20-cache, 21-serializer, 25-dynamic-modules, 27-scheduling, 28-sse, 29-file-upload, 30-event-emitter

**Communication Samples**:
- 02-gateways, 03-microservices, 04-grpc, 16-gateways-ws, 26-queues

**GraphQL Samples**:
- 12-graphql-schema-first, 22-graphql-prisma, 23-graphql-code-first, 31-graphql-federation-code-first, 32-graphql-federation-schema-first, 33-graphql-mercurius

**Build/Deployment Samples**:
- 08-webpack, 09-babel-example, 34-using-esm-packages, 35-use-esm-package-after-node22

## Components and Interfaces

### Testing Configuration Templates

#### Standard Jest Configuration
```typescript
// jest.config.js template for unit tests
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/*.model.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
};
```

#### E2E Jest Configuration
```typescript
// jest-e2e.config.js template
export default {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.model.ts',
  ],
  coverageDirectory: './coverage-e2e',
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
};
```

### Testing Utilities and Helpers

#### Database Testing Utilities
```typescript
// test/database-test.util.ts
export class DatabaseTestUtil {
  static async createTestDatabase(): Promise<DataSource> {
    // In-memory SQLite for TypeORM samples
    // MongoDB Memory Server for Mongoose samples
  }
  
  static async cleanupDatabase(dataSource: DataSource): Promise<void> {
    // Clean up test data
  }
}
```

#### Mock Factory Utilities
```typescript
// test/mock.factory.ts
export class MockFactory {
  static createMockRepository<T>(): MockType<Repository<T>> {
    return {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      // ... other repository methods
    };
  }
  
  static createMockService<T>(methods: string[]): MockType<T> {
    const mock = {};
    methods.forEach(method => {
      mock[method] = jest.fn();
    });
    return mock as MockType<T>;
  }
}
```

### Test Pattern Templates

#### Controller Unit Test Template
```typescript
describe('ExampleController', () => {
  let controller: ExampleController;
  let service: ExampleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExampleController],
      providers: [
        {
          provide: ExampleService,
          useValue: MockFactory.createMockService(['findAll', 'create', 'findOne', 'update', 'remove']),
        },
      ],
    }).compile();

    controller = module.get<ExampleController>(ExampleController);
    service = module.get<ExampleService>(ExampleService);
  });

  describe('findAll', () => {
    it('should return an array of items', async () => {
      // Arrange
      const expectedResult = [/* mock data */];
      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toBe(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
```

#### Service Unit Test Template
```typescript
describe('ExampleService', () => {
  let service: ExampleService;
  let repository: MockType<Repository<Example>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExampleService,
        {
          provide: getRepositoryToken(Example),
          useValue: MockFactory.createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
    repository = module.get(getRepositoryToken(Example));
  });

  describe('findAll', () => {
    it('should return all items', async () => {
      // Arrange
      const expectedResult = [/* mock data */];
      repository.find.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedResult);
      expect(repository.find).toHaveBeenCalled();
    });
  });
});
```

#### E2E Test Template
```typescript
describe('ExampleController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(DatabaseService)
    .useValue(mockDatabaseService)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('/examples (GET)', () => {
    it('should return all examples', () => {
      return request(app.getHttpServer())
        .get('/examples')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Data Models

### Test Configuration Model
```typescript
interface TestConfiguration {
  sampleName: string;
  testingStrategy: 'basic' | 'database' | 'advanced' | 'communication' | 'graphql' | 'build';
  requiredDependencies: string[];
  mockingStrategy: 'simple' | 'database' | 'external-services';
  e2eTestingApproach: 'http' | 'graphql' | 'websocket' | 'microservice';
  specialSetup?: string[];
}
```

### Sample Analysis Model
```typescript
interface SampleAnalysis {
  hasControllers: boolean;
  hasServices: boolean;
  hasGuards: boolean;
  hasInterceptors: boolean;
  hasPipes: boolean;
  hasDecorators: boolean;
  databaseType?: 'typeorm' | 'mongoose' | 'sequelize';
  communicationType?: 'rest' | 'graphql' | 'websocket' | 'grpc' | 'microservice';
  externalDependencies: string[];
}
```

## Error Handling

### Test Environment Error Handling
- **Database Connection Failures**: Use in-memory databases or mock services when external databases are unavailable
- **External Service Dependencies**: Provide mock implementations for all external services
- **Port Conflicts**: Use dynamic port allocation for e2e tests
- **Resource Cleanup**: Ensure proper cleanup of resources in afterEach/afterAll hooks

### Test Failure Scenarios
- **Flaky Tests**: Implement retry mechanisms for network-dependent tests
- **Memory Leaks**: Monitor and clean up resources properly
- **Timeout Issues**: Configure appropriate timeouts for different test types

## Testing Strategy

### Unit Testing Strategy

1. **Controller Testing**:
   - Mock all service dependencies
   - Test request/response handling
   - Test validation and error scenarios
   - Test authentication/authorization when applicable

2. **Service Testing**:
   - Mock repository/database dependencies
   - Test business logic thoroughly
   - Test error handling and edge cases
   - Test async operations

3. **Guard/Interceptor/Pipe Testing**:
   - Test execution context handling
   - Test transformation logic
   - Test error scenarios

### Integration Testing Strategy

1. **Module Testing**:
   - Test module configuration and dependency injection
   - Test inter-service communication
   - Use test databases for data persistence tests

2. **Database Integration**:
   - Use in-memory databases (SQLite for SQL, MongoDB Memory Server for MongoDB)
   - Test repository patterns and data access layers
   - Test migrations and schema changes

### E2E Testing Strategy

1. **REST API Testing**:
   - Test complete request/response cycles
   - Test authentication flows
   - Test file upload/download scenarios
   - Test error responses and status codes

2. **GraphQL Testing**:
   - Test queries, mutations, and subscriptions
   - Test schema validation
   - Test resolver error handling

3. **WebSocket Testing**:
   - Test connection establishment
   - Test message broadcasting
   - Test connection cleanup

4. **Microservice Testing**:
   - Test message patterns (request/response, event-based)
   - Test service discovery and communication
   - Test error handling and retries

### Sample-Specific Testing Approaches

#### Database Samples (05, 06, 07, 13, 14)
- Use in-memory databases for e2e tests
- Mock repositories for unit tests
- Test CRUD operations thoroughly
- Test relationship handling and constraints

#### Authentication Sample (19)
- Test JWT token generation and validation
- Test protected and unprotected routes
- Test token expiration scenarios
- Mock authentication providers

#### GraphQL Samples (12, 22, 23, 31, 32, 33)
- Test schema generation and validation
- Test resolver functionality
- Test subscription mechanisms
- Test federation scenarios (for federation samples)

#### File Upload Sample (29)
- Test file validation and processing
- Test multipart form handling
- Test file size and type restrictions
- Use mock files for testing

#### Caching Sample (20)
- Test cache hit/miss scenarios
- Test cache invalidation
- Mock cache providers for unit tests
- Test cache configuration

#### Microservice Samples (03, 04, 26)
- Test message patterns and communication
- Mock external services and message brokers
- Test error handling and retries
- Test service discovery mechanisms

## Implementation Phases

### Phase 1: Foundation Setup
1. Create testing utility libraries and helpers
2. Establish standard Jest configurations
3. Create mock factories and test data generators
4. Set up CI/CD integration for test execution

### Phase 2: Basic Sample Testing
1. Add tests to simple REST API samples (01, 10, 11, 15, 17, 18, 24)
2. Establish testing patterns and templates
3. Create documentation and examples

### Phase 3: Database Integration Testing
1. Add tests to database samples (05, 06, 07, 13, 14)
2. Implement in-memory database testing utilities
3. Create database-specific testing patterns

### Phase 4: Advanced Feature Testing
1. Add tests to advanced samples (19, 20, 21, 25, 27, 28, 29, 30)
2. Implement feature-specific testing utilities
3. Create specialized testing patterns

### Phase 5: Communication Testing
1. Add tests to communication samples (02, 03, 04, 16, 26)
2. Implement communication testing utilities
3. Create microservice testing patterns

### Phase 6: GraphQL Testing
1. Add tests to GraphQL samples (12, 22, 23, 31, 32, 33)
2. Implement GraphQL testing utilities
3. Create GraphQL-specific testing patterns

### Phase 7: Build/Deployment Testing
1. Add tests to build samples (08, 09, 34, 35)
2. Ensure tests work with different build configurations
3. Test ESM package compatibility