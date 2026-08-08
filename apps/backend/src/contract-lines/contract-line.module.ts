import { Module } from '@nestjs/common';
import { ContractLineController } from './contract-line.controller';
import { ContractLineService } from './contract-line.service';

@Module({
  controllers: [ContractLineController],
  providers: [ContractLineService],
})
export class ContractLineModule {}
