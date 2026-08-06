import { Module } from '@nestjs/common';
import { ServicePointController } from './service-point.controller';
import { ServicePointService } from './service-point.service';

@Module({
  controllers: [ServicePointController],
  providers: [ServicePointService],
})
export class ServicePointModule {}
