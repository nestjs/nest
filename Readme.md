[![Nest Logo](http://kamilmysliwiec.com/public/nest-logo.png)](http://kamilmysliwiec.com/)

  Modern, powerful web application framework for [Node.js](http://nodejs.org).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]

## Description

Nest is a powerful web framework for [Node.js](http://nodejs.org), which allows you to easily build efficient, scalable applications.
It uses modern JavaScript, is built with [TypeScript](http://www.typescriptlang.org) and bring best concepts to JavaScript back-end world such as Dependency Injection (with IoC Container) and Separation of Concerns.

It is not just another framework. You do not have to wait on large community, because Nest is built with awesome, popular well-known libraries - [Express](https://github.com/expressjs/express) and [socket.io](https://github.com/socketio/socket.io)! It means, that you could quickly start using framework with no worries about a third party plugins.

Nest is inspired by [Spring](https://spring.io) and [Angular](https://angular.io/) and is very much still a work in progress.

## Installation

```bash
$ npm install nest.js
```

## Philosophy

JavaScript is awesome. This language is no longer just a trash to create simple animations in the browser. Right now, the front end world is rich in variety of tools. We have a lot of amazing frameworks / libraries such as Angular, React or Vue, which improves our development process and makes our applications fast and flexible. 

Node.js gave us a possibility to use this language also on the server side. There are a lot of awesome libraries, helpers and tools for node, but non of them do not solve the main problem - the architecture. They just helps us to create faster, easier and produce cleaner code.

We want to create scalable, modern and ease to maintain applications. Nest is a solution.

## Features

- Compatible with both TypeScript and ES6 (I recommend to use TypeScript)
- Based on well-known libraries (Express / socket.io) so you could easily use your experiance 
- Easy to learn - syntax is really similar to Angular / Spring (Java)

## Documentation & Quick Start

Coming soon.

## Quick Start

####`app.ts`
```ts
import { NestApplication } from "nest";

export class Application implements NestApplication {
    constructor(private express) {
        // some configuration stuff
    }

    start() {
        // do something before server start
        this.express.listen(3030, () => {
            console.log("Application listen on port:", 3030);
        });
    }
}
```
####`app.module.ts`
```ts
import { Module } from "nest";

@Module({})
export class ApplicationModule {}
```
####`server.ts`
```ts
import { NestRunner } from "nest";
import { ApplicationModule } from "./app.module";
import { Application } from "./app";

NestRunner.run(Application, ApplicationModule);
```
That's it! As you can see, it is possible to add some code between two 'lifecycle' events of [Express](https://github.com/expressjs/express) instance - after server creation and before server listening (which means after all framework stuff). Why it is important? Cause right now, you could simply put here some necessary configurations, for example setup [body-parser](https://github.com/expressjs/body-parser) middleware or [morgan](https://github.com/expressjs/morgan) logger.

## Setup first controller

Controllers layer is responsible for handling HTTP requests. This is how we create controller in Nest application:

```ts
@Controller({ path: "users" })
class UsersController {
    
    @RequestMapping({ path: "/" })
    getAllUsers(res, req, next) {
        res.status(201).json({});
    }
    
}
```

## License

  [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/nest.js.svg
[npm-url]: https://npmjs.org/package/nest.js
[downloads-image]: https://img.shields.io/npm/dm/nest.js.svg
[downloads-url]: https://npmjs.org/package/nest.js
