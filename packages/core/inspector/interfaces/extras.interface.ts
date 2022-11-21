import { EnhancerSubtype } from '@nestjs/common/constants';

/**
 * Enhancers attached through APP_PIPE, APP_GUARD, APP_INTERCEPTOR, and APP_FILTER tokens.
 */
export interface AttachedEnhancerDefinition {
  nodeId: string;
}

/**
 * Enhancers registered through "app.useGlobalPipes()", "app.useGlobalGuards()", "app.useGlobalInterceptors()", and "app.useGlobalFilters()" methods.
 */
export interface OrphanedEnhancerDefinition {
  subtype: EnhancerSubtype;
  ref: unknown;
}

export interface Extras {
  orphanedEnhancers: Array<OrphanedEnhancerDefinition>;
  attachedEnhancers: Array<AttachedEnhancerDefinition>;
}
