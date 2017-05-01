import 'reflect-metadata';
import { ModuleMetadata } from '../../interfaces/module-metadata.interface';
import { InvalidModuleConfigException } from '../../../errors/exceptions/invalid-module-config.exception';
import { metadata } from '../../constants';

const metadataKeys = [
    metadata.MODULES,
    metadata.EXPORTS,
    metadata.COMPONENTS,
    metadata.CONTROLLERS,
];

const validateKeys = (keys: string[]) => {
    const isKeyValid = (key) => metadataKeys.findIndex(k => k === key) < 0;
    const validateKey = (key) => {
        if (isKeyValid(key)) {
            throw new InvalidModuleConfigException(key);
        }
    };
    keys.forEach(validateKey);
};

export const Module = (props: ModuleMetadata): ClassDecorator => {
    const propsKeys = Object.keys(props);
    validateKeys(propsKeys);

    return (target: object) => {
        for (const property in props) {
            if (props.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, props[property], target);
            }
        }
    };
};