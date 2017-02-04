import "reflect-metadata";

export const SocketServer: PropertyDecorator = (target: Object, propertyKey: string | symbol): void => {
    Reflect.set(target, propertyKey, null);
    Reflect.defineMetadata("__isSocketServer", true, target, propertyKey);
};