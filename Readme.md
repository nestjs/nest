<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="http://kamilmysliwiec.com/public/nest-logo.png#1" alt="Nest Logo" /></a>
</p>

[travis-image]: https://api.travis-ci.org/nestjs/nest.svg?branch=master
[travis-url]: https://travis-ci.org/nestjs/nest
[linux-image]: https://img.shields.io/travis/nestjs/nest/master.svg?label=linux
[linux-url]: https://travis-ci.org/nestjs/nest
  
  <p align="center">A progressive <a href="http://nodejs.org" target="blank">Node.js</a> framework for building efficient and scalable web applications. :cat: </p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore"><img src="https://img.shields.io/npm/dm/@nestjs/core.svg" alt="NPM Downloads" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://api.travis-ci.org/nestjs/nest.svg?branch=master" alt="Travis" /></a>
<a href="https://travis-ci.org/nestjs/nest"><img src="https://img.shields.io/travis/nestjs/nest/master.svg?label=linux" alt="Linux" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#2" alt="Coverage" /></a>
<a href="https://gitter.im/nestjs/nestjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge"><img src="https://badges.gitter.im/nestjs/nestjs.svg" alt="Gitter" /></a>
<a href="https://opencollective.com/nest#backer"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

<p>Nest is a framework for building efficient, scalable <a href="http://nodejs.org" target="_blank">Node.js</a> web applications. It uses modern JavaScript, is built with  <a href="http://www.typescriptlang.org" target="_blank">TypeScript</a> (preserves compatibility with pure JavaScript) and combines elements of OOP (Object Oriented Progamming), FP (Functional Programming), and FRP (Functional Reactive Programming).</p>
<p>Under the hood, Nest makes use of <a href="https://expressjs.com/" target="_blank">Express</a>, allowing for easy use of the myriad third-party plugins which are available.</p>

## Philosophy

<p>In recent years, thanks to Node.js, JavaScript has become the “lingua franca” of the web for both front and backend applications, giving rise to awesome projects like <a href="https://angular.io/" target="_blank">Angular</a>, <a href="https://github.com/facebook/react" target="_blank">React</a> and <a href="https://github.com/vuejs/vue" target="_blank">Vue</a> which improve developer productivity and enable the construction of fast, testable, extensible frontend applications. However, on the server-side, while there are a lot of superb libraries, helpers and tools for Node, none of them effectively solve the main problem - the architecture.</p>
<p>Nest aims to provide an application architecture out of the box which allows for effortless creation of highly testable, scalable, loosely coupled and easily maintainable applications.</p>

## Features

<ul>
    <li>Built with <a href="http://www.typescriptlang.org" target="_blank">TypeScript</a> (compatible with pure JavaScript + <a href="http://babeljs.io/" target="_blank">Babel</a>)</li>
    <li><strong>Easy</strong> to learn - syntax similar to <a href="https://angular.io/" target="_blank">Angular</a></li>
    <li><strong>Familiar</strong> - based on well-known libraries (<a href="https://github.com/expressjs/express" target="_blank">Express</a> / <a href="https://github.com/socketio/socket.io" target="_blank">socket.io</a>)</li>
    <li><strong>Dependency Injection</strong> - built-in asynchronous <strong>IoC</strong> container with a <strong>hierarchical injector</strong></li>
    <li><strong>WebSockets</strong> module (based on <a href="https://github.com/socketio/socket.io" target="_blank">socket.io</a>, but you can bring your own library, by making use of <code>WsAdapter</code>)</li>
    <li><strong>Modular</strong> - defines an easy to follow module definition pattern so you can split your system into reusable modules</li>
    <li><strong>Reactive microservice</strong> support with message patterns (built-in transport via TCP / <a href="https://redis.io/" target="_blank">Redis</a>, but other communication schemes can be implemented with <code>CustomTransportStrategy</code>)</li>
    <li><strong>Exception layer</strong> - throwable web exceptions with status codes, exception filters</li>
    <li><strong>Pipes</strong> - synchronous & asynchronous (e.g. validation purposes)</li>
    <li><strong>Guards</strong> - attach additional logic in a declarative manner (e.g. role-based access control)</li>
    <li><strong>Interceptors</strong> - built on top of <a href="https://github.com/reactivex/rxjs" target="blank">RxJS</a></li>
    <li>Testing utilities (both <strong>e2e & unit</strong> tests)</li>
  </ul>

## Installation

**Install the TypeScript Starter Project with Git:**
```bash
$ git clone https://github.com/nestjs/typescript-starter.git project
$ cd project
$ npm install
$ npm run start
```

**Install the JavaScript (Babel) Starter Project with Git:**
```bash
$ git clone https://github.com/nestjs/javascript-starter.git project
$ cd project
$ npm install
$ npm run start
```

**Start a New Project from Scratch with NPM:**
```bash
$ npm i --save @nestjs/core @nestjs/common @nestjs/microservices @nestjs/websockets @nestjs/testing reflect-metadata rxjs
```

## Documentation & Quick Start

:books: [Documentation & Tutorial](https://docs.nestjs.com)

## Sponsors

<a href="https://valor-software.com/"><img src="https://docs.nestjs.com/assets/sponsors/valor-software.png" width="210" /></a>

## Backers

I am on a mission to provide an architecture to create truly flexible, scalable and loosely coupled systems using the Node.js platform. It takes a lot of time, so if you want to support me, please [become a backer / sponsor]((https://opencollective.com/nest#backer)). I appreciate your help. Thanks! :heart_eyes:

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

## People

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)

## License

  [MIT](LICENSE)
