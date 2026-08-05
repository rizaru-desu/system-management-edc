import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { OtaUpdateStrategyService } from './strategies/ota-update.strategy';
import { ApkUpdateStrategyService } from './strategies/apk-update.strategy';

@Module({
  controllers: [MobileController],
  providers: [
    MobileService,
    OtaUpdateStrategyService,
    ApkUpdateStrategyService,
  ],
  exports: [MobileService],
})
export class MobileModule {}
