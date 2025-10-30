# Function: Controller()

Decorator that marks a class as a Nest controller that can receive inbound
requests and produce responses.

An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
It defines a class that provides the context for one or more related route
handlers that correspond to HTTP request methods and associated routes
for example `GET /api/profile`, `POST /users/resume`

A Microservice Controller responds to requests as well as events, running over
a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
It defines a class that provides a context for one or more message or event
handlers.

## Param

a `route path prefix` or a `ControllerOptions` object.
A `route path prefix` is pre-pended to the path specified in any request decorator
in the class. `ControllerOptions` is an options configuration object specifying:
- `scope` - symbol that determines the lifetime of a Controller instance.
[See Scope](https://docs.nestjs.com/fundamentals/injection-scopes#usage) for
more details.
- `prefix` - string that defines a `route path prefix`.  The prefix
is pre-pended to the path specified in any request decorator in the class.
- `version` - string, array of strings, or Symbol that defines the version
of all routes in the class. [See Versioning](https://docs.nestjs.com/techniques/versioning)
for more details.

## See

 - [Routing](https://docs.nestjs.com/controllers#routing)
 - [Controllers](https://docs.nestjs.com/controllers)
 - [Microservices](https://docs.nestjs.com/microservices/basics#request-response)
 - [Scope](https://docs.nestjs.com/fundamentals/injection-scopes#usage)
 - [Versioning](https://docs.nestjs.com/techniques/versioning)

## Public Api

## Call Signature

> **Controller**(): `ClassDecorator`

Defined in: packages/common/decorators/core/controller.decorator.ts:56

Decorator that marks a class as a Nest controller that can receive inbound
requests and produce responses.

An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
It defines a class that provides the context for one or more related route
handlers that correspond to HTTP request methods and associated routes
for example `GET /api/profile`, `POST /users/resume`.

A Microservice Controller responds to requests as well as events, running over
a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
It defines a class that provides a context for one or more message or event
handlers.

### Returns

`ClassDecorator`

### See

 - [Controllers](https://docs.nestjs.com/controllers)
 - [Microservices](https://docs.nestjs.com/microservices/basics#request-response)

### Public Api

## Call Signature

> **Controller**(`prefix`): `ClassDecorator`

Defined in: packages/common/decorators/core/controller.decorator.ts:81

Decorator that marks a class as a Nest controller that can receive inbound
requests and produce responses.

An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
It defines a class that provides the context for one or more related route
handlers that correspond to HTTP request methods and associated routes
for example `GET /api/profile`, `POST /users/resume`.

A Microservice Controller responds to requests as well as events, running over
a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
It defines a class that provides a context for one or more message or event
handlers.

### Parameters

#### prefix

string that defines a `route path prefix`.  The prefix
is pre-pended to the path specified in any request decorator in the class.

`string` | `string`[]

### Returns

`ClassDecorator`

### See

 - [Routing](https://docs.nestjs.com/controllers#routing)
 - [Controllers](https://docs.nestjs.com/controllers)
 - [Microservices](https://docs.nestjs.com/microservices/basics#request-response)

### Public Api

## Call Signature

> **Controller**(`options`): `ClassDecorator`

Defined in: packages/common/decorators/core/controller.decorator.ts:115

Decorator that marks a class as a Nest controller that can receive inbound
requests and produce responses.

An HTTP Controller responds to inbound HTTP Requests and produces HTTP Responses.
It defines a class that provides the context for one or more related route
handlers that correspond to HTTP request methods and associated routes
for example `GET /api/profile`, `POST /users/resume`.

A Microservice Controller responds to requests as well as events, running over
a variety of transports [(read more here)](https://docs.nestjs.com/microservices/basics).
It defines a class that provides a context for one or more message or event
handlers.

### Parameters

#### options

[`ControllerOptions`](../interfaces/ControllerOptions.md)

configuration object specifying:

- `scope` - symbol that determines the lifetime of a Controller instance.
[See Scope](https://docs.nestjs.com/fundamentals/injection-scopes#usage) for
more details.
- `prefix` - string that defines a `route path prefix`.  The prefix
is pre-pended to the path specified in any request decorator in the class.
- `version` - string, array of strings, or Symbol that defines the version
of all routes in the class. [See Versioning](https://docs.nestjs.com/techniques/versioning)
for more details.

### Returns

`ClassDecorator`

### See

 - [Routing](https://docs.nestjs.com/controllers#routing)
 - [Controllers](https://docs.nestjs.com/controllers)
 - [Microservices](https://docs.nestjs.com/microservices/basics#request-response)
 - [Versioning](https://docs.nestjs.com/techniques/versioning)

### Public Api
