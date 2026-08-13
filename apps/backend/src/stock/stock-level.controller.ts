import { Controller, Get, Query } from '@nestjs/common';
import type {
  EdcStockLevelRow,
  ItemCategoryOption,
  PeripheralStockLevelRow,
  ProductOption,
  StockLevelSummary,
} from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { parseStockLevelFiltersDto } from './dto/stock-level-filters.dto';
import { StockService } from './stock.service';
import type { StockWarehouseOption } from './stock.service';

/**
 * Stock Levels (Inventory → Stock Levels) — where every EDC unit and
 * accessory currently sits. EDC stock counts live IN_STOCK terminals per
 * (warehouse, product); peripheral stock reads the running
 * `warehouse_item_stocks` totals. Access follows the role-permission
 * matrix under the sidebar module key "stock" (the sidebar path of this
 * page); read-only by design — stock changes only through the flows that
 * move it.
 */
@Controller('stock-levels')
@RequirePermission('stock', 'view')
export class StockLevelController {
  constructor(private readonly stockService: StockService) {}

  /** The summary-card numbers (totals, per-type breakdown, low stock). */
  @Get('summary')
  summary(): Promise<StockLevelSummary> {
    return this.stockService.summary();
  }

  /** Per-(warehouse, product) counts of live IN_STOCK terminals. */
  @Get('edc')
  edcLevels(@Query() query: unknown): Promise<EdcStockLevelRow[]> {
    return this.stockService.edcLevels(parseStockLevelFiltersDto(query));
  }

  /** The warehouse_item_stocks totals, display-joined. */
  @Get('peripherals')
  peripheralLevels(
    @Query() query: unknown,
  ): Promise<PeripheralStockLevelRow[]> {
    return this.stockService.peripheralLevels(parseStockLevelFiltersDto(query));
  }

  /** Filter dropdown sources, served under this module's own grant. */
  @Get('warehouse-options')
  warehouseOptions(): Promise<StockWarehouseOption[]> {
    return this.stockService.warehouseOptions();
  }

  @Get('product-options')
  productOptions(): Promise<ProductOption[]> {
    return this.stockService.productOptions();
  }

  @Get('item-options')
  itemOptions(): Promise<ItemCategoryOption[]> {
    return this.stockService.itemOptions();
  }
}
