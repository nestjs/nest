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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const users_service_1 = require("./users.service");
const http_exception_1 = require("../../../src/core/exceptions/http-exception");
const utils_1 = require("../../../src/common/utils");
let AuthMiddleware = class AuthMiddleware {
    constructor(usersService) {
        this.usersService = usersService;
    }
    resolve() {
        return __awaiter(this, void 0, void 0, function* () {
            const xd = yield Promise.resolve(30);
            return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
                const username = req.headers['x-access-token'];
                const users = yield this.usersService.getAllUsers();
                const user = users.find(({ name }) => name === username);
                if (!user) {
                    throw new http_exception_1.HttpException('User not found.', 401);
                }
                req.user = user;
                next();
            });
        });
    }
};
AuthMiddleware = __decorate([
    utils_1.Middleware(),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], AuthMiddleware);
exports.AuthMiddleware = AuthMiddleware;
//# sourceMappingURL=auth.middleware.js.map