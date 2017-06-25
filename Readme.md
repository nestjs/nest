[![Nest Logo](http://kamilmysliwiec.com/public/nest-logo.png)](http://kamilmysliwiec.com/)

  Modern, powerful web application framework for [Node.js](http://nodejs.org).

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]
  [![Travis][travis-image]][travis-url]
  [![Linux][linux-image]][linux-url]
  [![Coverage Status](https://coveralls.io/repos/github/kamilmysliwiec/nest/badge.svg?branch=master)](https://coveralls.io/github/kamilmysliwiec/nest?branch=master)
  [![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)
 [![Gitter](https://badges.gitter.im/nestjs/nestjs.svg)](https://gitter.im/nestjs/nestjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)

## Description

Nest is a powerful web framework for [Node.js](http://nodejs.org), which helps you effortlessly build efficient, scalable applications. It uses modern JavaScript, is built with [TypeScript](http://www.typescriptlang.org) and combines best concepts of both OOP (Object Oriented Progamming) and FP (Functional Programming).

Nest is not just framework. You don’t have to wait for a large community, because Nest is built with awesome, popular, well-known libraries—[Express](https://github.com/expressjs/express) and [socket.io](https://github.com/socketio/socket.io) (you can use any other library if you want to)! This means that you can quickly start using Nest without worrying about third party plugins.

## Installation

**Install the TypeScript Starter Project with Git:**
```bash
$ git clone https://github.com/kamilmysliwiec/nest-typescript-starter.git project
$ cd project
$ npm install
$ npm run start
```

**Start a New Project from Scratch with NPM:**
```bash
$ npm i --save @nestjs/core @nestjs/common @nestjs/microservices @nestjs/websockets @nestjs/testing reflect-metadata rxjs
```

## Philosophy

JavaScript is awesome. This language is no longer just trash to create simple animations in the browser. Now, the front end world sports a rich variety of tools. We have a lot of amazing frameworks / libraries such as [Angular](https://angular.io/), [React](https://github.com/facebook/react) or [Vue](https://github.com/vuejs/vue) which improve our development process and make our applications fast and flexible. 

[Node.js](http://nodejs.org) enabled us to use JavaScript also on the server side. There are a lot of superb libraries, helpers and tools for node, but none of them solves the main problem—the architecture. 

We want to create scalable, loosely-coupled, easy-to-maintain applications. Let’s show the entire world the potential of node.js together!

## Features

- Easy to learn - syntax is similar to [Angular](https://angular.io/)
- Built on top of TypeScript, but also compatible with plain ES6 (I strongly recommend using [TypeScript](http://www.typescriptlang.org))
- Based on well-known libraries ([Express](https://github.com/expressjs/express) / [socket.io](https://github.com/socketio/socket.io)) so it’s a familiar experience 
- Supremely useful Dependency Injection, built-in **Inversion of Control** container
- **Hierarchical injector** - increase abstraction in your application by creating reusable, loosely-coupled modules with type injection
- **WebSockets** module (based on [socket.io](https://github.com/socketio/socket.io), although you can use any other library using adapters)
- Has its own modularity system (split your system into reusable modules)
- Reactive **microservice** support with message patterns (built-in transport via TCP / [Redis](https://redis.io/), but you can use any other type of communication using `CustomTransportStrategy`)
- Exceptions handler layer, exception filters, **sync & async pipes** layer
- Testing utilities

## Documentation & Quick Start

[Documentation & Tutorial](http://docs.nestjs.com)

## Starter repos

- [TypeScript](https://github.com/kamilmysliwiec/nest-typescript-starter)
- [Babel](https://github.com/kamilmysliwiec/nest-babel-starter/)

## Useful references

- [Modules](http://docs.nestjs.com/modules.html) 
- [Examples](http://docs.nestjs.com/examples.html)
- [API Reference](http://docs.nestjs.com/api-reference.html)

## People

- Author - [Kamil Myśliwiec](http://kamilmysliwiec.com)
- Website - [http://nestjs.com](http://nestjs.com/)

## Backers

I am on a mission to provide an architecture to create truly flexible, scalable and loosely coupled systems using the Node.js platform. It takes a lot of time, so if you want to support me, please [become a backer / sponsor]((https://opencollective.com/nest#backer)). I appreciate your help. Thanks!

<a href="https://opencollective.com/nest/backer/0/website" target="_blank"><img src="https://opencollective.com/nest/backer/0/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/1/website" target="_blank"><img src="https://opencollective.com/nest/backer/1/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/2/website" target="_blank"><img src="https://opencollective.com/nest/backer/2/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/3/website" target="_blank"><img src="https://opencollective.com/nest/backer/3/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/4/website" target="_blank"><img src="https://opencollective.com/nest/backer/4/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/5/website" target="_blank"><img src="https://opencollective.com/nest/backer/5/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/6/website" target="_blank"><img src="https://opencollective.com/nest/backer/6/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/7/website" target="_blank"><img src="https://opencollective.com/nest/backer/7/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/8/website" target="_blank"><img src="https://opencollective.com/nest/backer/8/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/9/website" target="_blank"><img src="https://opencollective.com/nest/backer/9/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/10/website" target="_blank"><img src="https://opencollective.com/nest/backer/10/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/11/website" target="_blank"><img src="https://opencollective.com/nest/backer/11/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/12/website" target="_blank"><img src="https://opencollective.com/nest/backer/12/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/13/website" target="_blank"><img src="https://opencollective.com/nest/backer/13/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/14/website" target="_blank"><img src="https://opencollective.com/nest/backer/14/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/15/website" target="_blank"><img src="https://opencollective.com/nest/backer/15/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/16/website" target="_blank"><img src="https://opencollective.com/nest/backer/16/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/17/website" target="_blank"><img src="https://opencollective.com/nest/backer/17/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/18/website" target="_blank"><img src="https://opencollective.com/nest/backer/18/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/19/website" target="_blank"><img src="https://opencollective.com/nest/backer/19/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/20/website" target="_blank"><img src="https://opencollective.com/nest/backer/20/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/21/website" target="_blank"><img src="https://opencollective.com/nest/backer/21/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/22/website" target="_blank"><img src="https://opencollective.com/nest/backer/22/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/23/website" target="_blank"><img src="https://opencollective.com/nest/backer/23/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/24/website" target="_blank"><img src="https://opencollective.com/nest/backer/24/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/25/website" target="_blank"><img src="https://opencollective.com/nest/backer/25/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/26/website" target="_blank"><img src="https://opencollective.com/nest/backer/26/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/27/website" target="_blank"><img src="https://opencollective.com/nest/backer/27/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/28/website" target="_blank"><img src="https://opencollective.com/nest/backer/28/avatar.svg"></a>
<a href="https://opencollective.com/nest/backer/29/website" target="_blank"><img src="https://opencollective.com/nest/backer/29/avatar.svg"></a>

## License

  [MIT](LICENSE)

[npm-image]: https://badge.fury.io/js/%40nestjs%2Fcore.svg
[npm-url]: https://www.npmjs.com/~nestjscore
[downloads-image]: https://img.shields.io/npm/dm/@nestjs/core.svg
[downloads-url]: https://www.npmjs.com/~nestjscore
[travis-image]: https://api.travis-ci.org/kamilmysliwiec/nest.svg?branch=master
[travis-url]: https://travis-ci.org/kamilmysliwiec/nest
[linux-image]: https://img.shields.io/travis/kamilmysliwiec/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/kamilmysliwiec/nest
