---
sidebar_position: 1
---

# Welcome to NestJS Deep Dive

Unlock the **hidden secrets** and **advanced patterns** of NestJS that the official documentation doesn't fully explore.

## What You'll Learn

This documentation goes beyond the basics to reveal:

- **Advanced Dependency Injection** patterns and scopes that power enterprise applications
- **Performance optimization** techniques used by high-scale NestJS applications
- **Microservices architecture** patterns for distributed systems
- **GraphQL federation** and advanced schema management
- **Custom decorators** and metadata manipulation for powerful abstractions
- **Lifecycle hooks** mastery for precise application control
- **Testing strategies** that ensure bulletproof applications

## Why This Documentation?

The official NestJS documentation is excellent for getting started, but it doesn't dive deep into:
- Why certain patterns exist
- How to leverage advanced features for production systems
- Performance implications of different approaches
- Real-world examples from complex applications
- Hidden APIs and undocumented features

This documentation fills that gap by exploring the **source code**, **real-world use cases**, and **advanced patterns** that make NestJS powerful.

## What Makes NestJS Powerful?

```typescript live
// Interactive example - Try editing this code!
function demonstrateDecorators() {
  const Injectable = () => (target) => {
    console.log('Injectable decorator applied!');
    return target;
  };

  @Injectable()
  class UserService {
    getUsers() {
      return ['Alice', 'Bob', 'Charlie'];
    }
  }

  return new UserService().getUsers();
}
```

NestJS combines:
- **TypeScript** for type safety and modern JavaScript features
- **Dependency Injection** inspired by Angular for testable, maintainable code
- **Decorators** for declarative programming
- **Modular architecture** for scalability
- **Platform agnostic** - works with Express, Fastify, and more

## Getting Started

Choose your path:

### 📚 **New to NestJS?**
Start with [Getting Started](/docs/getting-started/installation) to learn the fundamentals.

### 🚀 **Ready for Advanced Topics?**
Jump to [Advanced Topics](/docs/advanced/intro) to explore deep patterns.

### 📖 **Looking for API Reference?**
Check the [API Reference](/docs/api/intro) for complete API documentation.

## Interactive Examples

Throughout this documentation, you'll find **interactive code examples** that you can edit and run directly in your browser. Look for the **"live"** tag on code blocks.

## Navigation

Use the sidebar to navigate through different topics:
- **Documentation** - Core concepts and getting started guides
- **Advanced** - Deep dives into advanced patterns and techniques
- **API Reference** - Auto-generated API documentation from source code
- **Blog** - Articles, tutorials, and best practices

## Contributing

Found an error or want to improve the documentation? This is an open-source project built from the NestJS repository.

---

**Let's dive deep into NestJS!** 🚀
