---
sidebar_position: 1
---

# API Reference

Welcome to the **auto-generated API documentation** for NestJS core packages.

## What's Included

This API reference is automatically generated from the NestJS source code using **TypeDoc**. It provides detailed documentation for:

### 📦 @nestjs/core

The core framework functionality:
- **NestFactory** - Application bootstrapping
- **ModuleRef** - Runtime module reference
- **Reflector** - Metadata reflection utilities
- **ApplicationContext** - Application lifecycle management
- **Injector** - Dependency injection system
- **HttpAdapter** - HTTP platform abstraction

### 📦 @nestjs/common

Common utilities and decorators:
- **Decorators** - @Controller, @Injectable, @Module, etc.
- **Pipes** - ValidationPipe, ParseIntPipe, etc.
- **Guards** - CanActivate interface
- **Interceptors** - NestInterceptor interface
- **Filters** - ExceptionFilter interface
- **Interfaces** - Type definitions and contracts

## How to Use This Documentation

### Navigation

Use the sidebar to browse through different modules and classes. The documentation is organized by:

1. **Modules** - Logical grouping of functionality
2. **Classes** - Individual class documentation
3. **Interfaces** - Type definitions
4. **Functions** - Standalone functions
5. **Type Aliases** - Type definitions

### Reading Class Documentation

Each class page includes:

```typescript
// Example class structure
@Injectable()
export class ExampleService {
  /**
   * Constructor with dependency injection
   * @param dependency - Description of the dependency
   */
  constructor(private dependency: Dependency) {}

  /**
   * Method description
   * @param param - Parameter description
   * @returns Return value description
   * @throws {NotFoundException} When entity not found
   */
  async findOne(id: string): Promise<Entity> {
    // Implementation
  }
}
```

**Documentation includes:**
- 📝 **Description** - What the class/method does
- 🎯 **Parameters** - Input parameters and types
- 🔙 **Returns** - Return type and description
- ⚠️ **Throws** - Exceptions that can be thrown
- 💡 **Examples** - Usage examples (when available)
- 🔗 **Related** - Links to related classes/interfaces

### Understanding Decorators

Decorators are documented with their:
- **Signature** - How to use the decorator
- **Parameters** - Decorator configuration options
- **Metadata Key** - What metadata key it sets (for advanced usage)
- **Target** - Where the decorator can be applied (class, method, property, parameter)

Example:

```typescript
/**
 * Decorator that marks a class as a NestJS controller
 *
 * @param prefix - Route path prefix for all routes in this controller
 *
 * @publicApi
 */
export function Controller(prefix?: string | string[]): ClassDecorator;
```

### Type Definitions

Interfaces and type aliases show:
- **Properties** - All available properties with types
- **Methods** - Method signatures (for interfaces)
- **Generic Parameters** - Type parameters and constraints

Example:

```typescript
/**
 * Interface for exception filters
 *
 * @publicApi
 */
export interface ExceptionFilter<T = any> {
  /**
   * Method to handle exceptions
   *
   * @param exception - The exception that was thrown
   * @param host - Host context providing access to request/response
   */
  catch(exception: T, host: ArgumentsHost): any;
}
```

## Searching the API

Use your browser's search function (Ctrl+F or Cmd+F) to find specific:
- Class names
- Method names
- Interface names
- Type definitions

**Pro tip:** Use the search in the top navigation bar for quick access to any symbol.

## Common Patterns

### Dependency Injection

```typescript
// From @nestjs/common
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject('CONFIG') private config: ConfigType,
  ) {}
}
```

**See:**
- `@Injectable()` decorator
- `@Inject()` decorator
- `Provider` interface

### Request Handling

```typescript
// From @nestjs/common
@Controller('users')
export class UserController {
  @Get(':id')
  @UsePipes(ValidationPipe)
  @UseGuards(AuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @User() user: UserEntity,
  ): Promise<UserDto> {
    return this.userService.findOne(id);
  }
}
```

**See:**
- `@Controller()` decorator
- `@Get()`, `@Post()`, etc. decorators
- `@Param()`, `@Body()`, `@Query()` decorators
- `@UsePipes()`, `@UseGuards()` decorators

### Module Definition

```typescript
// From @nestjs/common
@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

**See:**
- `@Module()` decorator
- `ModuleMetadata` interface
- `DynamicModule` interface

## Source Code Links

Each API page includes links to:
- **Source code** - View the actual implementation on GitHub
- **Related classes** - Navigate to dependencies and related types
- **Usage examples** - See how it's used in the framework

## Versioning

This API documentation is generated from the current version of the NestJS framework in this repository.

**Version:** Check the `package.json` in each package for specific versions.

## Contributing

Found an error in the documentation?

1. Check if it's in the **source code comments** - API docs are auto-generated from JSDoc comments
2. Submit a PR to the main NestJS repository with improved documentation
3. Regenerate the API docs by running `npm run docs:generate`

## Additional Resources

### Official Documentation
- [NestJS Official Docs](https://docs.nestjs.com) - Guides and tutorials
- [NestJS GitHub](https://github.com/nestjs/nest) - Source code

### This Documentation
- [Getting Started](/docs/intro) - Introduction and overview
- [Advanced Topics](/docs/advanced/intro) - Deep dives and patterns
- **API Reference** (you are here) - Technical reference

## Quick Reference

### Most Used Classes

| Class | Package | Description |
|-------|---------|-------------|
| `NestFactory` | @nestjs/core | Create and bootstrap applications |
| `ModuleRef` | @nestjs/core | Runtime module reference |
| `HttpAdapterHost` | @nestjs/core | Access HTTP adapter |
| `Injectable` | @nestjs/common | Mark class as provider |
| `Controller` | @nestjs/common | Define HTTP controller |
| `Module` | @nestjs/common | Define module |

### Most Used Decorators

| Decorator | Purpose |
|-----------|---------|
| `@Injectable()` | Mark class as injectable provider |
| `@Controller()` | Define HTTP controller |
| `@Module()` | Define module |
| `@Get()`, `@Post()`, etc. | Define route handlers |
| `@Param()`, `@Body()`, `@Query()` | Extract request data |
| `@UseGuards()` | Apply guards |
| `@UsePipes()` | Apply pipes |
| `@UseInterceptors()` | Apply interceptors |

---

**Explore the API and discover the power of NestJS** 📚
