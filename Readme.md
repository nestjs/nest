[![Nest Logo](http://kamilmysliwiec.com/public/nest-logo.png)](http://kamilmysliwiec.com/)

  Modern, powerful web application framework for [Node.js](http://nodejs.org).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Travis][travis-image]][travis-url]
  [![Linux][linux-image]][linux-url]
  [![Coverage Status](https://coveralls.io/repos/github/kamilmysliwiec/nest/badge.svg?branch=master)](https://coveralls.io/github/kamilmysliwiec/nest?branch=master)

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

JavaScript is awesome. This language is no longer just a trash to create simple animations in the browser. Right now, the front end world is rich in variety of tools. We have a lot of amazing frameworks / libraries such as [Angular](https://angular.io/), [React](https://github.com/facebook/react) or [Vue](https://github.com/vuejs/vue), which improves our development process and makes our applications fast and flexible. 

[Node.js](http://nodejs.org) gave us a possibility to use this language also on the server side. There are a lot of superb libraries, helpers and tools for node, but non of them do not solve the main problem - the architecture. 

We want to create scalable, modern and easy to maintain applications. Nest helps us with it.

## Features

- Compatible with both TypeScript and ES6 (I recommend to use [TypeScript](http://www.typescriptlang.org))
- Based on well-known libraries ([Express](https://github.com/expressjs/express) / [socket.io](https://github.com/socketio/socket.io)) so you could share your experience 
- Easy to learn - syntax is similar to [Angular](https://angular.io/) / [Spring](https://spring.io) (Java)
- Dependency Injection, Inversion of Control Container
- Exceptions handler layer (helps to focus on logic)
- Own modularity system
- Sockets module (based on [socket.io](https://github.com/socketio/socket.io))

## Documentation & Quick Start

[Documentation & Tutorial](https://kamilmysliwiec.gitbooks.io/nest/content/)

## Future

Nest is very much still a work in progress. There is still some things to finish:

- Better test utilities
- Exception filters
- Starter repos
- Validation helpers
- Increase test coverage
- Gateways middleware
- and more...

## People

Author - [Kamil Myśliwiec](http://kamilmysliwiec.com)

## License

  [MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/nest.js.svg
[npm-url]: https://npmjs.org/package/nest.js
[downloads-image]: https://img.shields.io/npm/dm/nest.js.svg
[downloads-url]: https://npmjs.org/package/nest.js
[travis-image]: https://api.travis-ci.org/kamilmysliwiec/nest.svg?branch=master
[travis-url]: https://travis-ci.org/kamilmysliwiec/nest
[linux-image]: https://img.shields.io/travis/kamilmysliwiec/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/kamilmysliwiec/nest
