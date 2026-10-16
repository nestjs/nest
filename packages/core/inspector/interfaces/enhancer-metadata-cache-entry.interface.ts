import { InjectionToken } from '@nestjs/common';
import { EnhancerSubtype } from '@nestjs/common/constants';
import { InstanceWrapper } from '../../injector/instance-wrapper';

export interface EnhancerMetadataCacheEntry {
  targetNodeId?: string;
  moduleToken: string;
  classRef: InjectionToken;
  methodKey: string | undefined;
  enhancerRef?: unknown;
  enhancerInstanceWrapper?: InstanceWrapper;
  subtype: EnhancerSubtype;
}
