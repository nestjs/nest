"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const core_1 = require("./../src/core");
const app_module_1 = require("./modules/app.module");
const index_1 = require("../src/microservices/index");
const validator_pipe_1 = require("./common/validator.pipe");
const port = 3001;
const server = express();
server.use(bodyParser.json());
core_1.NestFactory.create(app_module_1.ApplicationModule, server).then((app) => __awaiter(this, void 0, void 0, function* () {
    const microservice = app.connectMicroservice({
        transport: index_1.Transport.TCP,
    });
    app.useGlobalPipes(new validator_pipe_1.ValidatorPipe());
    app.startAllMicroservices(() => console.log('All microservices are listening...'));
    yield app.listen(port, () => {
        console.log('Application listen on port:', port);
    });
}));
//# sourceMappingURL=server.js.map