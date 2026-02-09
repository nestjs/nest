import { Type } from '@nestjs/common';
import { EnhancerSubtype } from '@nestjs/common/constants.js';
import { InstanceWrapper } from '../../injector/instance-wrapper.js';

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: Type;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
