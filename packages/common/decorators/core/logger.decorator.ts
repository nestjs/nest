import { Logger as NestLogger } from "../../services"

export type Logger = NestLogger;

export function Logger(): PropertyDecorator {
    return (target: object, propertyKey: string|symbol) => {
        target[propertyKey] = new NestLogger(target.constructor.name);
    }
}