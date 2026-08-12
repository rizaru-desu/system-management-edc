import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@repo/auth';
import { AccountModule } from './accounts/account.module';
import { ContractLineModule } from './contract-lines/contract-line.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppReleaseModule } from './app-releases/app-release.module';
import { ItemCategoryModule } from './item-categories/item-category.module';
import { MailModule } from './mail/mail.module';
import { MerchantModule } from './merchants/merchant.module';
import { MobileModule } from './mobile/mobile.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductModule } from './products/product.module';
import { ProjectModule } from './projects/project.module';
import { ServicePointAssignmentModule } from './service-point-assignments/service-point-assignment.module';
import { InboundShipmentModule } from './inbound-shipments/inbound-shipment.module';
import { TerminalModule } from './terminals/terminal.module';
import { ServicePointModule } from './service-points/service-point.module';
import { UsersModule } from './users/users.module';
import { WarehouseModule } from './warehouses/warehouse.module';

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
    AccountModule,
    AppReleaseModule,
    ContractLineModule,
    ItemCategoryModule,
    UsersModule,
    PermissionsModule,
    MailModule,
    MerchantModule,
    MobileModule,
    ProductModule,
    ProjectModule,
    ServicePointModule,
    ServicePointAssignmentModule,
    TerminalModule,
    InboundShipmentModule,
    WarehouseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
