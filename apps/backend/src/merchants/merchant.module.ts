import { Module } from '@nestjs/common';
import { MerchantController } from './merchant.controller';
import { MerchantImportService } from './merchant-import.service';
import { MerchantService } from './merchant.service';

@Module({
  controllers: [MerchantController],
  providers: [MerchantService, MerchantImportService],
})
export class MerchantModule {}
