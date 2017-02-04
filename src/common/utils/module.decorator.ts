import "reflect-metadata";
import { ModuleMetadata } from "../interfaces/module-metadata.interface";
import { InvalidModuleConfigException } from "../../errors/exceptions/invalid-module-config.exception";

export const Module = (props: ModuleMetadata): ClassDecorator => {
    const propsKeys = Object.keys(props);
    const acceptableParams = [ "modules", "exports", "components", "controllers" ];

    propsKeys.map((prop) => {
       if (acceptableParams.findIndex((param) => param === prop) < 0) {
           throw new InvalidModuleConfigException(prop);
       }
    });
    return (target: Object) => {
        for (let property in props) {
            if (props.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, props[property], target);
            }
        }
    }
};