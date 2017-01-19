import "reflect-metadata";
import { GatewayProps } from "../interfaces";

export const SocketGateway = (props?: GatewayProps): ClassDecorator => {
    props = props || {};
    return (target: Object) => {
        Reflect.defineMetadata("__isGateway", true, target);
        Reflect.defineMetadata("namespace", props.namespace, target);
    }
};