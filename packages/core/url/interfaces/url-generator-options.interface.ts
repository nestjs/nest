import { ModuleMetadata } from '@nestjs/common';

export interface UrlGeneratorOptions {
  absoluteUrl: string;
}

export interface UrlGeneratorModuleOptions
  extends Pick<ModuleMetadata, 'imports'> {
  absoluteUrl?: string;
  useFactory?: (
    ...args: any[]
  ) => Promise<UrlGeneratorOptions> | UrlGeneratorOptions;
  inject?: any[];
}
