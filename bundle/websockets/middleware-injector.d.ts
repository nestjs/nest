import 'reflect-metadata';
import { NestContainer, InstanceWrapper } from '@nestjs/core/injector/container';
import { NestGateway } from './index';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { GatewayMiddleware } from './interfaces/gateway-middleware.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
export declare class MiddlewareInjector {
    private readonly container;
    private readonly config;
    constructor(container: NestContainer, config: ApplicationConfig);
    inject(server: any, instance: NestGateway, module: string): void;
    reflectMiddlewareTokens(instance: NestGateway): any[];
    applyMiddleware(server: any, components: Map<string, InstanceWrapper<Injectable>>, tokens: any[]): void;
    bindMiddleware(token: string, components: Map<string, InstanceWrapper<Injectable>>): any;
    isGatewayMiddleware(middleware: object): middleware is GatewayMiddleware;
}
