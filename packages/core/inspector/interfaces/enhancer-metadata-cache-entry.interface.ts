import { Type } from '@nestjs/common';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';
import { EnhancerSubtype } from '@nestjs/common/internal';

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: Type;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
