import type { InjectionToken } from '@nestjs/common';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import type { EnhancerSubtype } from '@nestjs/common/internal';

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: InjectionToken;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
