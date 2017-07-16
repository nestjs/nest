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
const users_service_1 = require("./users.service");
const _1 = require("./../../../src/");
const request_mapping_decorator_1 = require("../../../src/common/utils/decorators/request-mapping.decorator");
const use_pipes_decorator_1 = require("../../../src/common/utils/decorators/use-pipes.decorator");
const index_1 = require("../../../src/common/index");
const exception_filters_decorator_1 = require("../../../src/common/utils/decorators/exception-filters.decorator");
const exception_filter_1 = require("../../common/exception.filter");
const validator_pipe_1 = require("../../common/validator.pipe");
const common_1 = require("@nestjs/common");
const roles_guard_1 = require("./roles.guard");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    getAllUsers(res) {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield this.usersService.getAllUsers();
            res.status(index_1.HttpStatus.OK).json(users);
        });
    }
    getUser(res, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.usersService.getUser(id);
            res.status(index_1.HttpStatus.OK).json(user);
        });
    }
    addUser(res, user) {
        return __awaiter(this, void 0, void 0, function* () {
            const msg = yield this.usersService.addUser(user);
            res.status(index_1.HttpStatus.CREATED).json(msg);
        });
    }
};
__decorate([
    request_mapping_decorator_1.Get(),
    common_1.UseGuards(roles_guard_1.RolesGuard),
    __param(0, _1.Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAllUsers", null);
__decorate([
    request_mapping_decorator_1.Get('/:id'),
    __param(0, _1.Res()), __param(1, _1.Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    request_mapping_decorator_1.Post(),
    use_pipes_decorator_1.UsePipes(new validator_pipe_1.ValidatorPipe()),
    __param(0, _1.Res()), __param(1, _1.Body('user')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "addUser", null);
UsersController = __decorate([
    _1.Controller('users'),
    exception_filters_decorator_1.UseFilters(new exception_filter_1.CustomExceptionFilter()),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map