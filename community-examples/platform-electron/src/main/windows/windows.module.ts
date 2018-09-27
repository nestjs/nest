import { Module } from '@nest/core';
import { ElectronWindowsModule } from '@nest/platform-electron';

import { MainWindow } from './main.window';

@Module({
  imports: [ElectronWindowsModule.register([MainWindow])],
})
export class WindowsModule {}
