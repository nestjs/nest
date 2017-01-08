import "reflect-metadata";
import * as io from "socket.io";
import { NestContainer, InstanceWrapper } from "../core/container";
import { Component } from "../core/interfaces";
import { Gateway } from "./interfaces/gateway.interface";
import { SocketsContainer } from "./sockets-container";
import { SubjectsController } from "./subjects-controller";

export class SocketModule {
    private static socketsContainer = new SocketsContainer();
    private static PORT = 80;
    private static IOServer;
    private static subjectsController;

    static setup(container: NestContainer) {
        this.IOServer = io(SocketModule.PORT);
        this.subjectsController = new SubjectsController(this.socketsContainer, this.IOServer);

        const modules = container.getModules();
        modules.forEach(({ components }) => {
            this.scanComponentsForGateways(components);
        });
    }

    static scanComponentsForGateways(components: Map<Component, InstanceWrapper<Component>>) {
        components.forEach(({ instance }, componentType) => {
            const metadataKeys = Reflect.getMetadataKeys(componentType);
            if (metadataKeys.indexOf("__isGateway") >= 0) {
                this.subjectsController.hookGatewayIntoSocket(<Gateway>instance, componentType);
            }
        });
    }

}