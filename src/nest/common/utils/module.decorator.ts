import "reflect-metadata";
import { ModuleProps } from "./.";

export const Module = (filter: ModuleProps): ClassDecorator => {
    return (target: Object) => {
        for (let property in filter) {
            if (filter.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, filter[property], target);
            }
        }
    }
};