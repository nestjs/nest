"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const files_constants_1 = require("./files.constants");
let MulterModule = MulterModule_1 = class MulterModule {
    static register(options = {}) {
        return {
            module: MulterModule_1,
            providers: [{ provide: files_constants_1.MULTER_MODULE_OPTIONS, useValue: options }],
            exports: [files_constants_1.MULTER_MODULE_OPTIONS],
        };
    }
    static registerAsync(options) {
        return {
            module: MulterModule_1,
            imports: options.imports,
            providers: this.createAsyncProviders(options),
            exports: [files_constants_1.MULTER_MODULE_OPTIONS],
        };
    }
    static createAsyncProviders(options) {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }
        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass,
                useClass: options.useClass,
            },
        ];
    }
    static createAsyncOptionsProvider(options) {
        if (options.useFactory) {
            return {
                provide: files_constants_1.MULTER_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: files_constants_1.MULTER_MODULE_OPTIONS,
            useFactory: async (optionsFactory) => optionsFactory.createMulterOptions(),
            inject: [options.useExisting || options.useClass],
        };
    }
};
MulterModule = MulterModule_1 = __decorate([
    common_1.Module({})
], MulterModule);
exports.MulterModule = MulterModule;
var MulterModule_1;
