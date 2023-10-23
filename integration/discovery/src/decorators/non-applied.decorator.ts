import { DiscoveryService } from '@nestjs/core';

/**
 * This decorator must not be used anywhere!
 *
 * This will be used to test the scenario where we are trying to retrieving
 * metadata for a discoverable decorator that was not applied to any class.
 */
export const NonAppliedDecorator = DiscoveryService.createDecorator();
