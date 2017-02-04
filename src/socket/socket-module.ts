import "reflect-metadata";
import { NestContainer, InstanceWrapper } from "../core/injector/container";
import { Gateway } from "./interfaces/gateway.interface";
import { SocketsContainer } from "./container";
import { SubjectsController } from "./subjects-controller";
import { Injectable } from "../common/interfaces/injectable.interface";
import { SocketServerProvider } from "./socket-server-provider";

export class SocketModule {
    private static socketsContainer = new SocketsContainer();
    private static subjectsController;

    static setup(container: NestContainer) {
        this.subjectsController = new SubjectsController(
            new SocketServerProvider(this.socketsContainer));

        const modules = container.getModules();
        modules.forEach(({ components }) => this.hookGatewaysIntoServers(components));
    }

    static hookGatewaysIntoServers(components: Map<Injectable, InstanceWrapper<Injectable>>) {
        components.forEach(({ instance }, componentType) => {
            const metadataKeys = Reflect.getMetadataKeys(componentType);

            if (metadataKeys.indexOf("__isGateway") < 0) {
                return;
            }

            this.subjectsController.hookGatewayIntoServer(
                <Gateway>instance,
                componentType
            );
        });
    }

}