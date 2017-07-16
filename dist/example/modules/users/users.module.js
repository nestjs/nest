"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require("./../../../src/");
const users_controller_1 = require("./users.controller");
const users_service_1 = require("./users.service");
const auth_middleware_1 = require("./auth.middleware");
const chat_gateway_1 = require("./chat.gateway");
const AsyncToken = 'AsyncToken';
exports.AsyncToken2 = 'AsyncToken2';
const promiseTimeout = (t) => new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('test');
    }, t);
});
let UsersModule = class UsersModule {
    constructor(async) {
        this.async = async;
        console.log(async);
    }
    configure(consumer) {
        consumer.apply(auth_middleware_1.AuthMiddleware).forRoutes(users_controller_1.UsersController);
    }
};
UsersModule = __decorate([
    _1.Module({
        controllers: [users_controller_1.UsersController],
        components: [
            users_service_1.UsersService,
            chat_gateway_1.ChatGateway,
            {
                provide: AsyncToken,
                useFactory: () => __awaiter(this, void 0, void 0, function* () {
                    yield promiseTimeout(5000);
                    return 'async Value';
                }),
                inject: [],
            },
            {
                provide: exports.AsyncToken2,
                useValue: promiseTimeout(3000),
            },
        ],
    }),
    __param(0, _1.Inject(AsyncToken)),
    __metadata("design:paramtypes", [Object])
], UsersModule);
exports.UsersModule = UsersModule;
//# sourceMappingURL=users.module.js.map