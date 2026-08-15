import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { FieldEngineerController } from './field-engineer.controller';
import { FieldEngineerService } from './field-engineer.service';

@Module({
  imports: [PermissionsModule],
  controllers: [FieldEngineerController],
  providers: [FieldEngineerService],
})
export class FieldEngineerModule {}
