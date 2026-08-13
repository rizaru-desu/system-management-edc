import { Module } from '@nestjs/common';
import { StockLevelController } from './stock-level.controller';
import { StockMovementController } from './stock-movement.controller';
import { StockService } from './stock.service';

/**
 * The two read-only Inventory modules — Stock Movements and Stock Levels —
 * share one service since both are pure read models over the same data.
 * Their controllers keep separate permission keys ('stock-movements' and
 * 'stock'), matching their sidebar entries.
 */
@Module({
  controllers: [StockMovementController, StockLevelController],
  providers: [StockService],
})
export class StockModule {}
