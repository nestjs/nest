import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { PatternMetadata } from './interfaces/pattern-metadata.interface';
import { ClientOptions } from './interfaces/client-metadata.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
export declare class ListenerMetadataExplorer {
    private readonly metadataScanner;
    constructor(metadataScanner: MetadataScanner);
    explore(instance: Controller): PatternProperties[];
    exploreMethodMetadata(instance: any, instancePrototype: any, methodName: string): PatternProperties;
    scanForClientHooks(instance: Controller): IterableIterator<ClientProperties>;
}
export interface ClientProperties {
    property: string;
    metadata: ClientOptions;
}
export interface PatternProperties {
    pattern: PatternMetadata;
    targetCallback: (...args) => any;
}
