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
import type { ServicePointListPage, ServicePointRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateServicePointDto } from './dto/create-service-point.dto';
import { parseListServicePointsDto } from './dto/list-service-points.dto';
import { parseUpdateServicePointDto } from './dto/update-service-point.dto';
import { ServicePointService } from './service-point.service';
import type { ServicePointTreeNode } from './utils/tree-builder.util';

/**
 * Service point master data (Administration → Service Point). Access follows
 * the role-permission matrix under the sidebar module key "service-points";
 * System Administrators always pass.
 */
@Controller('service-points')
@RequirePermission('service-points', 'view')
export class ServicePointController {
  constructor(private readonly servicePointService: ServicePointService) {}

  @Get()
  list(@Query() query: unknown): Promise<ServicePointListPage> {
    return this.servicePointService.list(parseListServicePointsDto(query));
  }

  /** Static segment declared before ':id' so the router never shadows it. */
  @Get('tree')
  tree(): Promise<ServicePointTreeNode[]> {
    return this.servicePointService.tree();
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ServicePointRow> {
    return this.servicePointService.get(id);
  }

  @Post()
  @RequirePermission('service-points', 'create')
  create(@Body() body: unknown): Promise<ServicePointRow> {
    return this.servicePointService.create(parseCreateServicePointDto(body));
  }

  @Patch(':id')
  @RequirePermission('service-points', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ServicePointRow> {
    return this.servicePointService.update(
      id,
      parseUpdateServicePointDto(body),
    );
  }

  @Delete(':id')
  @RequirePermission('service-points', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.servicePointService.remove(id);
  }
}
