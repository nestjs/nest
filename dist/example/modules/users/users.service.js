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
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require("./../../../src/");
const http_exception_1 = require("../../../src/core/exceptions/http-exception");
const index_1 = require("../../../src/common/index");
let UsersService = class UsersService {
    constructor(xd) {
        this.users = [
            { id: 1, name: 'John Doe' },
            { id: 2, name: 'Alice Caeiro' },
            { id: 3, name: 'Who Knows' },
        ];
        console.log(xd);
    }
    getAllUsers() {
        return Promise.resolve(this.users);
    }
    getUser(id) {
        const user = this.users.find((user) => user.id === +id);
        if (!user) {
            throw new http_exception_1.HttpException('User not found', 404);
        }
        return Promise.resolve(user);
    }
    addUser(user) {
        this.users.push(user);
        return Promise.resolve();
    }
};
UsersService = __decorate([
    _1.Component(),
    __param(0, index_1.Inject('AsyncToken2')),
    __metadata("design:paramtypes", [Object])
], UsersService);
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map