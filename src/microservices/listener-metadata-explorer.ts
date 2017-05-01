import { Controller } from '../common/interfaces/controller.interface';
import { isFunction } from '../common/utils/shared.utils';
import {
    PATTERN_METADATA, PATTERN_HANDLER_METADATA, CLIENT_CONFIGURATION_METADATA,
    CLIENT_METADATA,
} from './constants';
import { isUndefined } from 'util';
import { PatternMetadata } from './interfaces/pattern-metadata.interface';
import { ClientMetadata } from './interfaces/client-metadata.interface';
import { MetadataScanner } from './../core/metadata-scanner';

export class ListenerMetadataExplorer {
    constructor(private readonly metadataScanner: MetadataScanner) {}

    public explore(instance: Controller): PatternProperties[] {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.metadataScanner.scanFromPrototype<Controller, PatternProperties>(
            instance,
            instancePrototype,
            (method) => this.exploreMethodMetadata(instance, instancePrototype, method),
        );
    }

    public exploreMethodMetadata(instance, instancePrototype, methodName: string): PatternProperties {
        const callbackMethod = instancePrototype[methodName];
        const isPattern = Reflect.getMetadata(PATTERN_HANDLER_METADATA, callbackMethod);

        if (isUndefined(isPattern)) {
            return null;
        }
        const pattern = Reflect.getMetadata(PATTERN_METADATA, callbackMethod);
        return {
            targetCallback: (callbackMethod as PatternProperties['targetCallback']).bind(instance),
            pattern,
        };
    }

    public *scanForClientHooks(instance: Controller): IterableIterator<ClientProperties> {
        for (const propertyKey in instance) {
            if (isFunction(propertyKey)) continue;

            const property = String(propertyKey);
            const isClient = Reflect.getMetadata(CLIENT_METADATA, instance, property);
            if (isUndefined(isClient)) continue;

            const metadata = Reflect.getMetadata(CLIENT_CONFIGURATION_METADATA, instance, property);
            yield { property, metadata };
        }
    }

}

export interface ClientProperties {
    property: string;
    metadata: ClientMetadata;
}

export interface PatternProperties {
    pattern: PatternMetadata;
    targetCallback: (...args) => any;
}