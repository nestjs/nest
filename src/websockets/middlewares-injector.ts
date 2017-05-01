import 'reflect-metadata';
import { NestContainer, InstanceWrapper } from '../core/injector/container';
import { NestGateway } from './index';
import { GATEWAY_MIDDLEWARES } from './constants';
import { UnkownModuleException } from '../errors/exceptions/unkown-module.exception';
import { Injectable } from '../common/interfaces/injectable.interface';
import { RuntimeException } from '../errors/exceptions/runtime.exception';
import { GatewayMiddleware } from './interfaces/gateway-middleware.interface';
import { isUndefined, isFunction, isNil } from '../common/utils/shared.utils';

export class MiddlewaresInjector {
    constructor(private container: NestContainer) {}

    public inject(server, instance: NestGateway, module: string) {
        const opaqueTokens = this.reflectMiddlewaresTokens(instance);
        const modules = this.container.getModules();
        if (!modules.has(module)) {
            throw new UnkownModuleException();
        }
        const { components } = modules.get(module);
        this.applyMiddlewares(server, components, opaqueTokens);
    }

    public reflectMiddlewaresTokens(instance: NestGateway): any[] {
        const prototype = Object.getPrototypeOf(instance);
        return Reflect.getMetadata(GATEWAY_MIDDLEWARES, prototype.constructor) || [];
    }

    public applyMiddlewares(server, components: Map<string, InstanceWrapper<Injectable>>, tokens: any[]) {
        tokens.map(token => this.bindMiddleware(token.name, components))
            .filter(middleware => !isNil(middleware))
            .map(middleware => server.use(middleware));
    }

    public bindMiddleware(token: string, components: Map<string, InstanceWrapper<Injectable>>) {
        if (!components.has(token)) {
            throw new RuntimeException();
        }
        const { instance } = components.get(token);
        if (!this.isGatewayMiddleware(instance)) return null;

        const middleware = instance.resolve();
        return isFunction(middleware) ? middleware.bind(instance) : null;
    }

    public isGatewayMiddleware(middleware: object): middleware is GatewayMiddleware {
        return !isUndefined((middleware as GatewayMiddleware).resolve);
    }
}