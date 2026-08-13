import { Controller, Get, Query } from '@nestjs/common';
import type {
  EdcStockMovementPage,
  PeripheralStockMovementPage,
} from '@repo/db';
import { RequirePermission } from '../permissions/require-permission.decorator';
import {
  parseListEdcMovementsDto,
  parseListPeripheralMovementsDto,
} from './dto/list-stock-movements.dto';
import { StockService } from './stock.service';
import type { StockWarehouseOption } from './stock.service';

/**
 * Stock Movements (Inventory → Stock Movements) — the read-only audit
 * trail. EDC rows are `terminal_status_history` with the movement type
 * derived from each status transition; peripheral rows come from the
 * `peripheral_stock_movements` log. Access follows the role-permission
 * matrix under the sidebar module key "stock-movements"; there are no
 * write endpoints by design.
 */
@Controller('stock-movements')
@RequirePermission('stock-movements', 'view')
export class StockMovementController {
  constructor(private readonly stockService: StockService) {}

  /** The EDC unit movement log, newest first. */
  @Get()
  edcMovements(@Query() query: unknown): Promise<EdcStockMovementPage> {
    return this.stockService.edcMovements(parseListEdcMovementsDto(query));
  }

  /** The peripheral quantity-change log, newest first. */
  @Get('peripherals')
  peripheralMovements(
    @Query() query: unknown,
  ): Promise<PeripheralStockMovementPage> {
    return this.stockService.peripheralMovements(
      parseListPeripheralMovementsDto(query),
    );
  }

  /** Warehouse filter options (tree order with depth + parent). */
  @Get('warehouse-options')
  warehouseOptions(): Promise<StockWarehouseOption[]> {
    return this.stockService.warehouseOptions();
  }
}
