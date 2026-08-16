import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { InboundShipmentController } from './inbound-shipment.controller';
import { InboundShipmentService } from './inbound-shipment.service';

@Module({
  imports: [MailModule],
  controllers: [InboundShipmentController],
  providers: [InboundShipmentService],
})
export class InboundShipmentModule {}
