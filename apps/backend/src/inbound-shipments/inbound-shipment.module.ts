import { Module } from '@nestjs/common';
import { InboundShipmentController } from './inbound-shipment.controller';
import { InboundShipmentService } from './inbound-shipment.service';

@Module({
  controllers: [InboundShipmentController],
  providers: [InboundShipmentService],
})
export class InboundShipmentModule {}
