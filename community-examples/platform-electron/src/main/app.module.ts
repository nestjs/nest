import { Module } from '@nest/core';
import { ElectronModule } from '@nest/platform-electron';

import { WindowsModule } from './windows';

@Module({
  imports: [ElectronModule.forRoot(), WindowsModule],
})
export class AppModule {}
