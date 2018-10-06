import { Inject, Injectable } from '@nestjs/common';
import { DependencyService } from './dependency.service';

@Injectable()
export class PropertiesService {
  @Inject(DependencyService) service: DependencyService;
}
