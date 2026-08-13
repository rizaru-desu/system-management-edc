import { Injectable } from '@nestjs/common';
import {
  listAllWarehouses,
  listEdcStockLevels,
  listEdcStockMovements,
  listItemCategoryOptions,
  listPeripheralStockLevels,
  listPeripheralStockMovements,
  listProductOptions,
  stockLevelSummary,
} from '@repo/db';
import type {
  EdcStockLevelRow,
  EdcStockMovementPage,
  ItemCategoryOption,
  ListEdcStockMovementsOptions,
  ListPeripheralStockMovementsOptions,
  PeripheralStockLevelRow,
  PeripheralStockMovementPage,
  ProductOption,
  StockLevelFilters,
  StockLevelSummary,
  WarehouseRow,
} from '@repo/db';
import { buildWarehouseTree } from '../warehouses/utils/tree-builder.util';
import type { WarehouseTreeNode } from '../warehouses/utils/tree-builder.util';

/**
 * One warehouse dropdown option, in tree order with its nesting depth and
 * parent — the parent link lets the Stock Levels console rebuild the
 * hierarchy grouping client-side.
 */
export interface StockWarehouseOption {
  id: string;
  name: string;
  code: string;
  type: WarehouseRow['type'];
  parentId: string | null;
  /** 0 = Central level; drives the indentation. */
  depth: number;
}

/**
 * Read-model service shared by the Stock Movements and Stock Levels
 * controllers — every query lives in @repo/db; nothing here writes.
 */
@Injectable()
export class StockService {
  edcMovements(
    options: ListEdcStockMovementsOptions,
  ): Promise<EdcStockMovementPage> {
    return listEdcStockMovements(options);
  }

  peripheralMovements(
    options: ListPeripheralStockMovementsOptions,
  ): Promise<PeripheralStockMovementPage> {
    return listPeripheralStockMovements(options);
  }

  edcLevels(filters: StockLevelFilters): Promise<EdcStockLevelRow[]> {
    return listEdcStockLevels(filters);
  }

  peripheralLevels(
    filters: StockLevelFilters,
  ): Promise<PeripheralStockLevelRow[]> {
    return listPeripheralStockLevels(filters);
  }

  summary(): Promise<StockLevelSummary> {
    return stockLevelSummary();
  }

  /**
   * Dropdown options for the filter bars, served under the caller's own
   * module grant (the same decoupling every other module uses): the live
   * warehouse tree flattened with depth + parent, active products and
   * active item categories.
   */
  async warehouseOptions(): Promise<StockWarehouseOption[]> {
    const roots = buildWarehouseTree(await listAllWarehouses());
    const options: StockWarehouseOption[] = [];
    const walk = (node: WarehouseTreeNode, depth: number) => {
      options.push({
        id: node.id,
        name: node.name,
        code: node.code,
        type: node.type,
        parentId: node.parentId,
        depth,
      });
      for (const child of node.children) walk(child, depth + 1);
    };
    for (const root of roots) walk(root, 0);
    return options;
  }

  productOptions(): Promise<ProductOption[]> {
    return listProductOptions();
  }

  itemOptions(): Promise<ItemCategoryOption[]> {
    return listItemCategoryOptions();
  }
}
