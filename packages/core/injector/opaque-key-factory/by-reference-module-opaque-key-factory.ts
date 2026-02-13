import { createHash } from 'crypto';
import { ModuleOpaqueKeyFactory } from './interfaces/module-opaque-key-factory.interface.js';
import { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/internal';

const K_MODULE_ID = Symbol('K_MODULE_ID');

export class ByReferenceModuleOpaqueKeyFactory implements ModuleOpaqueKeyFactory {
  private readonly keyGenerationStrategy: 'random' | 'shallow';

  constructor(options?: { keyGenerationStrategy: 'random' | 'shallow' }) {
    this.keyGenerationStrategy = options?.keyGenerationStrategy ?? 'random';
  }

  public createForStatic(
    moduleCls: Type,
    originalRef: Type | ForwardReference = moduleCls,
  ): string {
    return this.getOrCreateModuleId(moduleCls, undefined, originalRef);
  }

  public createForDynamic(
    moduleCls: Type<unknown>,
    dynamicMetadata: Omit<DynamicModule, 'module'>,
    originalRef: DynamicModule | ForwardReference,
  ): string {
    return this.getOrCreateModuleId(moduleCls, dynamicMetadata, originalRef);
  }

  private getOrCreateModuleId(
    moduleCls: Type<unknown>,
    dynamicMetadata: Partial<DynamicModule> | undefined,
    originalRef: Type | DynamicModule | ForwardReference,
  ): string {
    if (originalRef[K_MODULE_ID]) {
      return originalRef[K_MODULE_ID];
    }

    let moduleId: string;
    if (this.keyGenerationStrategy === 'random') {
      moduleId = this.generateRandomString();
    } else {
      const delimiter = ':';
      moduleId = dynamicMetadata
        ? `${this.generateRandomString()}${delimiter}${this.hashString(moduleCls.name + JSON.stringify(dynamicMetadata))}`
        : `${this.generateRandomString()}${delimiter}${this.hashString(moduleCls.toString())}`;
    }

    originalRef[K_MODULE_ID] = moduleId;
    return moduleId;
  }

  private hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private generateRandomString(): string {
    return randomStringGenerator();
  }
}
