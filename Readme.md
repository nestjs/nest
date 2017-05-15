[![Nest Logo](http://kamilmysliwiec.com/public/nest-logo.png)](http://kamilmysliwiec.com/)

  Modern, powerful web application framework for [Node.js](http://nodejs.org).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Travis][travis-image]][travis-url]
  [![Linux][linux-image]][linux-url]
  [![Coverage Status](https://coveralls.io/repos/github/kamilmysliwiec/nest/badge.svg?branch=master)](https://coveralls.io/github/kamilmysliwiec/nest?branch=master)

## Description

Nest is a powerful web framework for [Node.js](http://nodejs.org), which helps you effortlessly build efficient, scalable applications. It uses modern JavaScript, is built with [TypeScript](http://www.typescriptlang.org) and combines best concepts of both OOP (Object Oriented Progamming) and FP (Functional Programming).

It is not just another framework. You do not have to wait for a large community, because Nest is built with awesome, popular well-known libraries - [Express](https://github.com/expressjs/express) and [socket.io](https://github.com/socketio/socket.io)! It means, that you could quickly start using framework without worrying about a third party plugins.

## Installation

**Git:**
```bash
$ git clone https://github.com/kamilmysliwiec/nest-typescript-starter.git project
$ cd project
$ npm install
$ npm run start
```

**NPM:**
```bash
$ npm i --save @nestjs/core @nestjs/common @nestjs/microservices @nestjs/websockets @nestjs/testing reflect-metadata rxjs redis
```

## Philosophy

JavaScript is awesome. This language is no longer just a trash to create simple animations in the browser. Right now, the front end world is rich in variety of tools. We have a lot of amazing frameworks / libraries such as [Angular](https://angular.io/), [React](https://github.com/facebook/react) or [Vue](https://github.com/vuejs/vue), which improves our development process and makes our applications fast and flexible. 

[Node.js](http://nodejs.org) gave us a possibility to use this language also on the server side. There are a lot of superb libraries, helpers and tools for node, but non of them do not solve the main problem - the architecture. 

We want to create scalable, modern and easy to maintain applications. Nest helps us with it.

## Features

- Easy to learn - syntax is similar to [Angular](https://angular.io/)
- Compatible with both TypeScript and ES6 (I strongly recommend to use [TypeScript](http://www.typescriptlang.org))
- Based on well-known libraries ([Express](https://github.com/expressjs/express) / [socket.io](https://github.com/socketio/socket.io)) so you could share your experience 
- Supremely useful Dependency Injection, built-in **Inversion of Control** container
- **Hierarchical injector** - increase abstraction in your application by creating reusable, loosely coupled modules with type injection
- Own modularity system (split your system into reusable modules)
- **WebSockets** module (based on [socket.io](https://github.com/socketio/socket.io))
- Reactive **microservices** support with messages patterns (transport via TCP / [Redis](https://redis.io/))
- Exceptions handler layer
- Testing utilities

## Documentation & Quick Start

[Documentation & Tutorial](https://kamilmysliwiec.gitbooks.io/nest/content/)

## Starter repos

- [TypeScript](https://github.com/kamilmysliwiec/nest-typescript-starter)
- [Babel](https://github.com/kamilmysliwiec/nest-babel-starter/)

## Modules

- [CQRS - Event-Driven Architecture](https://github.com/kamilmysliwiec/nest-cqrs) 

## Examples

- [Auth0](https://github.com/cdiaz/nestjs-auth0.git) by [@cdiaz](https://github.com/cdiaz)
- [TypeORM](https://github.com/zachgrayio/nest-typeorm-example) by [@zachgrayio](https://github.com/zachgrayio/)
- [CQRS, Event-Driven Architecture](https://github.com/kamilmysliwiec/nest-cqrs-example) by [@kamilmysliwiec](https://github.com/kamilmysliwiec/)

## People

- Author - [Kamil Myśliwiec](http://kamilmysliwiec.com)
- Website - [http://nestjs.com](http://nestjs.com/)

## License

  [MIT](LICENSE)

[npm-image]: https://badge.fury.io/js/%40nestjs%2Fcore.svg
[npm-url]: https://www.npmjs.com/~nestjscore
[downloads-image]: https://img.shields.io/npm/dm/nest.js.svg
[downloads-url]: https://www.npmjs.com/~nestjscore
[travis-image]: https://api.travis-ci.org/kamilmysliwiec/nest.svg?branch=master
[travis-url]: https://travis-ci.org/kamilmysliwiec/nest
[linux-image]: https://img.shields.io/travis/kamilmysliwiec/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/kamilmysliwiec/nest
