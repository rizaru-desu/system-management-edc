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
import type { MerchantListPage, MerchantRow } from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseCreateMerchantDto } from './dto/create-merchant.dto';
import { parseMerchantFilterDto } from './dto/merchant-filter.dto';
import { parseUpdateMerchantDto } from './dto/update-merchant.dto';
import { MerchantService } from './merchant.service';

/**
 * Merchant master data (Merchant Management → Merchants). Access follows
 * the role-permission matrix under the sidebar module key "merchants";
 * System Administrators always pass.
 */
@Controller('merchants')
@RequirePermission('merchants', 'view')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get()
  list(@Query() query: unknown): Promise<MerchantListPage> {
    return this.merchantService.list(parseMerchantFilterDto(query));
  }

  @Get(':id')
  get(@Param('id') id: string): Promise<MerchantRow> {
    return this.merchantService.get(id);
  }

  @Post()
  @RequirePermission('merchants', 'create')
  create(@Body() body: unknown): Promise<MerchantRow> {
    return this.merchantService.create(parseCreateMerchantDto(body));
  }

  @Patch(':id')
  @RequirePermission('merchants', 'update')
  update(@Param('id') id: string, @Body() body: unknown): Promise<MerchantRow> {
    return this.merchantService.update(id, parseUpdateMerchantDto(body));
  }

  @Delete(':id')
  @RequirePermission('merchants', 'delete')
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.merchantService.remove(id);
  }
}
