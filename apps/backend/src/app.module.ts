import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@repo/auth';
import { AccountModule } from './accounts/account.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppReleaseModule } from './app-releases/app-release.module';
import { MailModule } from './mail/mail.module';
import { MerchantModule } from './merchants/merchant.module';
import { MobileModule } from './mobile/mobile.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ServicePointAssignmentModule } from './service-point-assignments/service-point-assignment.module';
import { ServicePointModule } from './service-points/service-point.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
    AccountModule,
    AppReleaseModule,
    UsersModule,
    PermissionsModule,
    MailModule,
    MerchantModule,
    MobileModule,
    ServicePointModule,
    ServicePointAssignmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
