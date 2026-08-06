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
import { parseImportMerchantsDto } from './dto/import-merchants.dto';
import { parseMerchantFilterDto } from './dto/merchant-filter.dto';
import { parseUpdateMerchantDto } from './dto/update-merchant.dto';
import { MerchantImportService } from './merchant-import.service';
import type {
  MerchantImportPreview,
  MerchantImportResult,
} from './merchant-import.service';
import { MerchantService } from './merchant.service';

/**
 * Merchant master data (Merchant Management → Merchants). Access follows
 * the role-permission matrix under the sidebar module key "merchants";
 * System Administrators always pass.
 */
@Controller('merchants')
@RequirePermission('merchants', 'view')
export class MerchantController {
  constructor(
    private readonly merchantService: MerchantService,
    private readonly merchantImportService: MerchantImportService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<MerchantListPage> {
    return this.merchantService.list(parseMerchantFilterDto(query));
  }

  /**
   * Validation + nearest-service-point assignment preview for the Excel
   * import — nothing is written.
   */
  @Post('import/preview')
  @RequirePermission('merchants', 'create')
  previewImport(@Body() body: unknown): Promise<MerchantImportPreview> {
    return this.merchantImportService.preview(
      parseImportMerchantsDto(body).rows,
    );
  }

  /** Commits the import: saves the valid, automatically assigned rows. */
  @Post('import')
  @RequirePermission('merchants', 'create')
  import(@Body() body: unknown): Promise<MerchantImportResult> {
    return this.merchantImportService.import(
      parseImportMerchantsDto(body).rows,
    );
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
