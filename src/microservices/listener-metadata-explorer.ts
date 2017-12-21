import {
    CLIENT_CONFIGURATION_METADATA,
    CLIENT_METADATA,
    PATTERN_HANDLER_METADATA,
    PATTERN_METADATA,
} from './constants';
import { isFunction, isUndefined } from '@nestjs/common/utils/shared.utils';

import { ClientMetadata } from './interfaces/client-metadata.interface';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { PatternMetadata } from './interfaces/pattern-metadata.interface';

export class ListenerMetadataExplorer {
    constructor(private readonly metadataScanner: MetadataScanner) { }

    public explore(instance: Controller): PatternProperties[] {
        const instancePrototype = Object.getPrototypeOf(instance);
        return this.metadataScanner.scanFromPrototype<Controller, PatternProperties>(
            instance,
            instancePrototype,
            (method) => this.exploreMethodMetadata(instance, instancePrototype, method),
        );
    }

    public exploreMethodMetadata(instance: any, instancePrototype: any, methodName: string): PatternProperties {
        const targetCallback = instancePrototype[methodName];
        const isPattern = Reflect.getMetadata(PATTERN_HANDLER_METADATA, targetCallback);

        if (isUndefined(isPattern)) {
            return null;
        }
        const pattern = Reflect.getMetadata(PATTERN_METADATA, targetCallback);
        return {
            targetCallback,
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
    // pattern: PatternMetadata;
    pattern: string;
    targetCallback: (...args: any[]) => any;
}
