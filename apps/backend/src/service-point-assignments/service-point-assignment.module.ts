import { Module } from '@nestjs/common';
import { ServicePointAssignmentController } from './service-point-assignment.controller';
import { ServicePointAssignmentService } from './service-point-assignment.service';

@Module({
  controllers: [ServicePointAssignmentController],
  providers: [ServicePointAssignmentService],
})
export class ServicePointAssignmentModule {}
