import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { MobileVersionAdminRow, MobileVersionListPage } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AppReleaseService } from './app-release.service';
import { parseCreateAppReleaseDto } from './dto/create-app-release.dto';
import { parseListAppReleasesDto } from './dto/list-app-releases.dto';
import { parsePublishAppReleaseDto } from './dto/publish-app-release.dto';
import { parseUpdateAppReleaseDto } from './dto/update-app-release.dto';

/**
 * APK / OTA release management (Administration → App Releases). Access
 * follows the role-permission matrix under the sidebar module key
 * "app-releases"; System Administrators always pass. The mobile-facing
 * check-update endpoint stays in the mobile module — this controller only
 * manages the release catalogue behind it.
 */
@Controller('app-releases')
@RequirePermission('app-releases', 'view')
export class AppReleaseController {
  constructor(private readonly appReleaseService: AppReleaseService) {}

  @Get()
  list(@Query() query: unknown): Promise<MobileVersionListPage> {
    return this.appReleaseService.list(parseListAppReleasesDto(query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<MobileVersionAdminRow> {
    return this.appReleaseService.get(id);
  }

  @Post()
  @RequirePermission('app-releases', 'create')
  create(@Body() body: unknown): Promise<MobileVersionAdminRow> {
    return this.appReleaseService.create(parseCreateAppReleaseDto(body));
  }

  @Patch(':id/publish')
  @RequirePermission('app-releases', 'update')
  publish(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<MobileVersionAdminRow> {
    return this.appReleaseService.setPublished(
      id,
      parsePublishAppReleaseDto(body).isActive,
    );
  }

  @Patch(':id')
  @RequirePermission('app-releases', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<MobileVersionAdminRow> {
    return this.appReleaseService.update(id, parseUpdateAppReleaseDto(body));
  }

  @Delete(':id')
  @RequirePermission('app-releases', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.appReleaseService.remove(id);
  }
}
