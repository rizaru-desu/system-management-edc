import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionsController } from './permissions.controller';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';

/**
 * Role-permission matrix storage plus its enforcement. The guard is global so
 * any controller can demand a grant with `@RequirePermission(...)` without
 * importing this module; it runs after the Better Auth `AuthGuard` (that
 * module is registered first in `AppModule`) and ignores undecorated routes.
 */
@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}
