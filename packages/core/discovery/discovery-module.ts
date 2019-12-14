import { Module } from '@nestjs/common';
import { MetadataScanner } from '../metadata-scanner';
import { DiscoveryService } from './discovery-service';

@Module({
  providers: [MetadataScanner, DiscoveryService],
  exports: [MetadataScanner, DiscoveryService],
})
export class DiscoveryModule {}
