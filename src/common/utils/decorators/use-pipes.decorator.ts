import { PipeTransform } from '../../interfaces/index';
import { PIPES_METADATA } from '../../constants';

export const UsePipes = (...pipes: PipeTransform<any>[]) => {
    return (target: object, key?, descriptor?) => {
        if (descriptor) {
            Reflect.defineMetadata(PIPES_METADATA, pipes, descriptor.value);
            return descriptor;
        }
        Reflect.defineMetadata(PIPES_METADATA, pipes, target);
        return target;
    };
};
