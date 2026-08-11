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
import type {
  ItemCategoryOption,
  ProductDetailRow,
  ProductListPage,
} from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateProductDto } from './dto/create-product.dto';
import { parseListProductsDto } from './dto/list-products.dto';
import { parseUpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

/**
 * Product master data (Terminal Lifecycle → Products). Access follows the
 * role-permission matrix under the sidebar module key "products"; System
 * Administrators always pass.
 */
@Controller('products')
@RequirePermission('products', 'view')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(@Query() query: unknown): Promise<ProductListPage> {
    return this.productService.list(parseListProductsDto(query));
  }

  /**
   * Completeness-item choices for the editor dropdown. A static segment
   * declared before ':id' so the router never shadows it.
   */
  @Get('completeness-item-options')
  completenessItemOptions(): Promise<ItemCategoryOption[]> {
    return this.productService.completenessItemOptions();
  }

  /** The row plus its full standard completeness list (joined item data). */
  @Get(':id')
  get(@Param('id') id: string): Promise<ProductDetailRow> {
    return this.productService.get(id);
  }

  @Post()
  @RequirePermission('products', 'create')
  create(@Body() body: unknown): Promise<ProductDetailRow> {
    return this.productService.create(parseCreateProductDto(body));
  }

  @Patch(':id')
  @RequirePermission('products', 'update')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ProductDetailRow> {
    return this.productService.update(id, parseUpdateProductDto(body));
  }

  /** Body-less quick toggle for the table's status switch. */
  @Patch(':id/toggle-status')
  @RequirePermission('products', 'update')
  toggleStatus(@Param('id') id: string): Promise<ProductDetailRow> {
    return this.productService.toggleStatus(id);
  }

  @Delete(':id')
  @RequirePermission('products', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.productService.remove(id);
  }
}
