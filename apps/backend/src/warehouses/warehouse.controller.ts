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
import type { WarehouseListPage, WarehouseRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateWarehouseDto } from './dto/create-warehouse.dto';
import { parseEligibleParentsDto } from './dto/eligible-parents.dto';
import { parseListWarehousesDto } from './dto/list-warehouses.dto';
import { parseUpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseService } from './warehouse.service';
import type { WarehouseDetail } from './warehouse.service';
import type { WarehouseTreeNode } from './utils/tree-builder.util';

/**
 * Warehouse master data (Inventory → Warehouses). Access follows the
 * role-permission matrix under the sidebar module key "warehouses";
 * System Administrators always pass.
 */
@Controller('warehouses')
@RequirePermission('warehouses', 'view')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  list(@Query() query: unknown): Promise<WarehouseListPage> {
    return this.warehouseService.list(parseListWarehousesDto(query));
  }

  /** Static segments declared before ':id' so the router never shadows them. */
  @Get('tree')
  tree(): Promise<WarehouseTreeNode[]> {
    return this.warehouseService.tree();
  }

  @Get('eligible-parents')
  eligibleParents(@Query() query: unknown): Promise<WarehouseRow[]> {
    const dto = parseEligibleParentsDto(query);
    return this.warehouseService.eligibleParents(dto.type, dto.excludeId);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<WarehouseDetail> {
    return this.warehouseService.detail(id);
  }

  @Get(':id/children')
  children(@Param('id') id: string): Promise<WarehouseRow[]> {
    return this.warehouseService.children(id);
  }

  @Post()
  @RequirePermission('warehouses', 'create')
  create(@Body() body: unknown): Promise<WarehouseRow> {
    return this.warehouseService.create(parseCreateWarehouseDto(body));
  }

  @Patch(':id')
  @RequirePermission('warehouses', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<WarehouseRow> {
    return this.warehouseService.update(id, parseUpdateWarehouseDto(body));
  }

  /** Body-less quick toggle for the table's status switch. */
  @Patch(':id/toggle-status')
  @RequirePermission('warehouses', 'update')
  toggleStatus(@Param('id') id: string): Promise<WarehouseRow> {
    return this.warehouseService.toggleStatus(id);
  }

  @Delete(':id')
  @RequirePermission('warehouses', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.warehouseService.remove(id);
  }
}
