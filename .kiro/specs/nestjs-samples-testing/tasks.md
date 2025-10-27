# Implementation Plan

- [ ] 1. Create testing foundation and utilities
  - Create shared testing utilities and mock factories that can be reused across all samples
  - Implement database testing utilities for in-memory databases (SQLite, MongoDB Memory Server)
  - Create standardized Jest configuration templates for unit and e2e tests
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.3_

- [ ] 2. Implement testing utilities and helpers
- [ ] 2.1 Create mock factory utility class
  - Write MockFactory class with methods for creating mock repositories, services, and common NestJS providers
  - Implement type-safe mock creation with proper TypeScript interfaces
  - Create unit tests for the mock factory utility
  - _Requirements: 1.4, 4.5_

- [ ] 2.2 Create database testing utility class
  - Write DatabaseTestUtil class for setting up in-memory databases (SQLite for TypeORM, MongoDB Memory Server for Mongoose)
  - Implement database cleanup and reset methods for test isolation
  - Create unit tests for database testing utilities
  - _Requirements: 5.2, 5.3, 5.4_

- [ ] 2.3 Create test configuration templates
  - Write standardized Jest configuration files for unit tests and e2e tests
  - Create TypeScript configuration templates for test files
  - Implement test setup files with common test utilities and global configurations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Add comprehensive tests to basic REST API samples
- [ ] 3.1 Add tests to 01-cats-app sample
  - Write unit tests for CatsController with proper mocking of CatsService
  - Write unit tests for CatsService testing all CRUD operations
  - Write e2e tests for all REST endpoints (/cats GET, POST)
  - Update package.json with proper test scripts and Jest configuration
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3_

- [ ] 3.2 Add tests to 10-fastify sample
  - Write unit tests for controllers and services using Fastify-specific testing patterns
  - Write e2e tests using Fastify test utilities instead of supertest
  - Ensure tests work with Fastify platform adapter
  - _Requirements: 1.1, 1.2, 2.1, 5.1_

- [ ] 3.3 Add tests to 11-swagger sample
  - Write unit tests for controllers with Swagger decorators
  - Write e2e tests that validate API documentation endpoints
  - Test Swagger schema generation and validation
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2_

- [ ] 3.4 Add tests to 15-mvc and 17-mvc-fastify samples
  - Write unit tests for MVC controllers that render views
  - Write e2e tests for view rendering and template processing
  - Test static file serving and view engine integration
  - _Requirements: 1.1, 1.2, 2.1, 2.4_

- [ ] 4. Add comprehensive tests to database integration samples
- [ ] 4.1 Add tests to 05-sql-typeorm sample
  - Write unit tests for UsersController with mocked UsersService
  - Write unit tests for UsersService with mocked TypeORM repository
  - Write integration tests using in-memory SQLite database
  - Write e2e tests for all CRUD endpoints with test database
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 5.2, 5.3_

- [ ] 4.2 Add tests to 06-mongoose and 14-mongoose-base samples
  - Write unit tests for controllers and services with mocked Mongoose models
  - Write integration tests using MongoDB Memory Server
  - Write e2e tests with test MongoDB instance
  - Test Mongoose schema validation and middleware
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 5.2, 5.3_

- [ ] 4.3 Add tests to 07-sequelize sample
  - Write unit tests with mocked Sequelize models
  - Write integration tests using in-memory SQLite with Sequelize
  - Write e2e tests for database operations
  - Test Sequelize associations and validations
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 5.2, 5.3_

- [ ] 5. Add comprehensive tests to authentication and security samples
- [ ] 5.1 Add tests to 19-auth-jwt sample
  - Write unit tests for AuthService testing JWT token generation and validation
  - Write unit tests for AuthGuard testing authentication logic
  - Write e2e tests for login endpoint and protected routes
  - Test authentication failure scenarios and token expiration
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.4, 4.3_

- [ ] 5.2 Add tests to 20-cache sample
  - Write unit tests for services with cache integration
  - Write unit tests testing cache hit/miss scenarios
  - Write e2e tests validating cache behavior
  - Mock cache providers for unit tests and use real cache for integration tests
  - _Requirements: 1.1, 1.2, 2.1, 7.3_

- [ ] 6. Add comprehensive tests to GraphQL samples
- [ ] 6.1 Add tests to 23-graphql-code-first sample
  - Write unit tests for GraphQL resolvers with mocked services
  - Write unit tests for GraphQL services and data access layers
  - Write e2e tests for GraphQL queries and mutations
  - Test GraphQL schema generation and validation
  - _Requirements: 1.1, 1.2, 2.2, 7.2_

- [ ] 6.2 Add tests to 12-graphql-schema-first sample
  - Write unit tests for schema-first GraphQL resolvers
  - Write e2e tests for GraphQL operations with schema validation
  - Test GraphQL schema loading and type generation
  - _Requirements: 1.1, 1.2, 2.2, 7.2_

- [ ] 6.3 Add tests to 22-graphql-prisma sample
  - Write unit tests for resolvers with mocked Prisma client
  - Write integration tests using Prisma test database
  - Write e2e tests for GraphQL operations with Prisma
  - Test Prisma schema and database operations
  - _Requirements: 1.1, 1.2, 1.5, 2.2, 7.2_

- [ ] 7. Add comprehensive tests to WebSocket and real-time samples
- [ ] 7.1 Add tests to 02-gateways sample
  - Write unit tests for WebSocket gateways with mocked socket connections
  - Write e2e tests for WebSocket connection and message handling
  - Test WebSocket event broadcasting and client communication
  - _Requirements: 1.1, 1.2, 2.3, 7.1_

- [ ] 7.2 Add tests to 16-gateways-ws sample
  - Write unit tests for WebSocket gateways using ws library
  - Write e2e tests for WebSocket connections and message patterns
  - Test WebSocket authentication and authorization
  - _Requirements: 1.1, 1.2, 2.3, 7.1_

- [ ] 8. Add comprehensive tests to microservice samples
- [ ] 8.1 Add tests to 03-microservices sample
  - Write unit tests for microservice controllers and message handlers
  - Write integration tests for microservice communication patterns
  - Write e2e tests for request/response and event-based messaging
  - Mock external microservices and message brokers
  - _Requirements: 1.1, 1.2, 2.1, 2.5, 7.1_

- [ ] 8.2 Add tests to 04-grpc sample
  - Write unit tests for gRPC service implementations
  - Write integration tests for gRPC client/server communication
  - Write e2e tests for gRPC method calls and streaming
  - Mock gRPC services and test error handling
  - _Requirements: 1.1, 1.2, 2.1, 2.5, 7.1_

- [ ] 9. Add comprehensive tests to advanced feature samples
- [ ] 9.1 Add tests to 29-file-upload sample
  - Write unit tests for file upload controllers with mocked file handling
  - Write unit tests for file validation and processing services
  - Write e2e tests for file upload endpoints with test files
  - Test file size limits, type validation, and error scenarios
  - _Requirements: 1.1, 1.2, 2.1, 4.3, 7.5_

- [ ] 9.2 Add tests to 27-scheduling sample
  - Write unit tests for scheduled task services
  - Write integration tests for cron job execution
  - Test scheduled task error handling and recovery
  - Mock time-based operations for predictable testing
  - _Requirements: 1.1, 1.2, 2.1, 7.4_

- [ ] 9.3 Add tests to 25-dynamic-modules sample
  - Write unit tests for dynamic module configuration
  - Write integration tests for module registration and dependency injection
  - Test dynamic module options and factory providers
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 10. Add comprehensive tests to communication and queue samples
- [ ] 10.1 Add tests to 26-queues sample
  - Write unit tests for queue processors and job handlers
  - Write integration tests for queue operations (add, process, retry)
  - Write e2e tests for complete job processing workflows
  - Mock queue providers and test error handling scenarios
  - _Requirements: 1.1, 1.2, 2.1, 2.5, 7.1_

- [ ] 10.2 Add tests to 28-sse sample
  - Write unit tests for Server-Sent Events controllers
  - Write e2e tests for SSE connection and event streaming
  - Test SSE client connection handling and event broadcasting
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 11. Add comprehensive tests to specialized samples
- [ ] 11.1 Add tests to 21-serializer sample
  - Write unit tests for custom serializers and transformers
  - Write e2e tests validating response serialization
  - Test serialization with different data types and nested objects
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2_

- [ ] 11.2 Add tests to 30-event-emitter sample
  - Write unit tests for event emitters and listeners
  - Write integration tests for event-driven workflows
  - Test event handling, error scenarios, and async event processing
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 12. Add tests to GraphQL federation samples
- [ ] 12.1 Add tests to 31-graphql-federation-code-first sample
  - Write unit tests for federated GraphQL services (gateway, users-application, posts-application)
  - Write integration tests for service federation and schema composition
  - Write e2e tests for federated GraphQL queries across services
  - Test federation directives and service communication
  - _Requirements: 1.1, 1.2, 2.2, 7.2_

- [ ] 12.2 Add tests to 32-graphql-federation-schema-first sample
  - Write unit tests for schema-first federated services
  - Write integration tests for federated schema composition
  - Write e2e tests for cross-service GraphQL operations
  - Test schema federation and service discovery
  - _Requirements: 1.1, 1.2, 2.2, 7.2_

- [ ] 13. Add tests to build and deployment samples
- [ ] 13.1 Add tests to 34-using-esm-packages sample
  - Write unit tests that work with ESM package imports
  - Write e2e tests validating ESM package functionality
  - Test ESM mocking strategies and module resolution
  - Ensure tests work with experimental VM modules flag
  - _Requirements: 1.1, 1.2, 2.1, 5.1_

- [ ] 13.2 Add tests to 35-use-esm-package-after-node22 sample
  - Write unit tests for Node.js 22+ ESM package usage
  - Write e2e tests for ESM package functionality in Node 22+
  - Test native ESM support without experimental flags
  - _Requirements: 1.1, 1.2, 2.1, 5.1_

- [ ] 14. Implement coverage reporting and CI integration
- [ ] 14.1 Set up coverage reporting for all samples
  - Configure Jest coverage collection for unit and e2e tests
  - Set up coverage thresholds appropriate for each sample type
  - Generate coverage reports in lcov and json formats
  - Create coverage exclusion patterns for non-source files
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 14.2 Create test execution scripts and documentation
  - Write npm scripts for running tests across all samples
  - Create documentation for testing patterns and best practices
  - Write contribution guidelines for adding tests to new samples
  - Create CI/CD integration examples for automated testing
  - _Requirements: 3.2, 5.1, 6.5_