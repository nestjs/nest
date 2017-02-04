[![Nest Logo](http://kamilmysliwiec.com/public/nest-logo.png)](http://kamilmysliwiec.com/)

  Modern, powerful web application framework for [Node.js](http://nodejs.org).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]

## Description

Nest is a powerful web framework for [Node.js](http://nodejs.org), which allows you to easily build efficient, scalable applications.
It uses modern JavaScript, is built with [TypeScript](http://www.typescriptlang.org) and introduces best concepts to JavaScript back-end world such as Dependency Injection (with IoC Container) and Separation of Concerns.

It is not just another framework. You do not have to wait on large community, because Nest is built with awesome, popular well-known libraries - [Express](https://github.com/expressjs/express) and [socket.io](https://github.com/socketio/socket.io)! It means, that you could quickly start using framework with no worries about a third party plugins.

Nest is inspired by [Spring](https://spring.io) and [Angular](https://angular.io/) and is very much still a work in progress.

## Installation

```bash
$ npm install nest.js
```

## Quick Start

```bash
```#app.ts
```
```ts
import { NestApplication } from "nest";

export class Application implements NestApplication {
    constructor(private application) {}

    start() {
        this.application.listen(3030, () => {
            console.log("Application listen on port:", 3030);
        });
    }
}
```

## License

  [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/nest.js.svg
[npm-url]: https://npmjs.org/package/nest.js
[downloads-image]: https://img.shields.io/npm/dm/nest.js.svg
[downloads-url]: https://npmjs.org/package/nest.js
