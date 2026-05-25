import { Module } from '@nestjs/common';
import { MetadataScanner } from '../metadata-scanner.js';
import { DiscoveryService } from './discovery-service.js';

/**
 * @publicApi
 */
@Module({
  providers: [MetadataScanner, DiscoveryService],
  exports: [MetadataScanner, DiscoveryService],
})
export class DiscoveryModule {}
