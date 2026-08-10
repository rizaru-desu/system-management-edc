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
import type { ItemCategoryListPage, ItemCategoryRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateItemCategoryDto } from './dto/create-item-category.dto';
import { parseListItemCategoriesDto } from './dto/list-item-categories.dto';
import { parseUpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategoryService } from './item-category.service';

/**
 * Item category master data (Administration → Item Categories). Access
 * follows the role-permission matrix under the sidebar module key
 * "item-categories"; System Administrators always pass.
 */
@Controller('item-categories')
@RequirePermission('item-categories', 'view')
export class ItemCategoryController {
  constructor(private readonly itemCategoryService: ItemCategoryService) {}

  @Get()
  list(@Query() query: unknown): Promise<ItemCategoryListPage> {
    return this.itemCategoryService.list(parseListItemCategoriesDto(query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<ItemCategoryRow> {
    return this.itemCategoryService.get(id);
  }

  @Post()
  @RequirePermission('item-categories', 'create')
  create(@Body() body: unknown): Promise<ItemCategoryRow> {
    return this.itemCategoryService.create(parseCreateItemCategoryDto(body));
  }

  @Patch(':id')
  @RequirePermission('item-categories', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ItemCategoryRow> {
    return this.itemCategoryService.update(
      id,
      parseUpdateItemCategoryDto(body),
    );
  }

  /** Body-less quick toggle for the table's status switch. */
  @Patch(':id/toggle-status')
  @RequirePermission('item-categories', 'update')
  toggleStatus(@Param('id') id: string): Promise<ItemCategoryRow> {
    return this.itemCategoryService.toggleStatus(id);
  }

  @Delete(':id')
  @RequirePermission('item-categories', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.itemCategoryService.remove(id);
  }
}
