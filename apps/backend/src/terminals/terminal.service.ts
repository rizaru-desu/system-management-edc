import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createTerminal,
  findTerminalById,
  listAllWarehouses,
  listMerchantOptions,
  listProductOptions,
  listTerminalHistory,
  listTerminals,
  softDeleteTerminal,
  updateTerminal,
} from '@repo/db';
import type {
  ListTerminalsOptions,
  MerchantOption,
  ProductOption,
  TerminalDetailRow,
  TerminalHistoryRow,
  TerminalListPage,
  TerminalWriteError,
  WarehouseRow,
} from '@repo/db';
import type { CreateTerminalDto } from './dto/create-terminal.dto';
import type { UpdateTerminalDto } from './dto/update-terminal.dto';
import { buildWarehouseTree } from '../warehouses/utils/tree-builder.util';
import type { WarehouseTreeNode } from '../warehouses/utils/tree-builder.util';

/** One warehouse dropdown option, in tree order with its nesting depth. */
export interface TerminalWarehouseOption {
  id: string;
  name: string;
  code: string;
  type: WarehouseRow['type'];
  /** 0 = Central level; drives the indentation in the dropdown. */
  depth: number;
}

/** Human wording of the shared create/update reference violations. */
function writeException(
  error: TerminalWriteError,
): ConflictException | BadRequestException {
  switch (error) {
    case 'serial-taken':
      return new ConflictException('Serial number is already in use.');
    case 'product-not-found':
      return new BadRequestException('Product not found.');
    case 'warehouse-not-found':
      return new BadRequestException('Warehouse not found.');
    case 'merchant-not-found':
      return new BadRequestException('Merchant not found.');
    case 'merchant-requires-installed':
      return new BadRequestException(
        'A merchant can only be attached while the terminal status is Installed.',
      );
  }
}

@Injectable()
export class TerminalService {
  /**
   * One page of terminals with optional search/status/warehouse/product
   * filters plus the filtered total; product, warehouse and merchant
   * display fields come joined (the query itself lives in @repo/db).
   */
  list(options: ListTerminalsOptions): Promise<TerminalListPage> {
    return listTerminals(options);
  }

  /** One terminal with its movement history (newest first). */
  async get(id: string): Promise<TerminalDetailRow> {
    const terminal = await findTerminalById(id);
    if (!terminal) throw new NotFoundException('Terminal not found.');
    return terminal;
  }

  /** Just the movement history, for lazy-loading the detail section. */
  async history(id: string): Promise<TerminalHistoryRow[]> {
    const terminal = await findTerminalById(id);
    if (!terminal) throw new NotFoundException('Terminal not found.');
    return listTerminalHistory(id);
  }

  /**
   * Dropdown options for the terminal form, all served under the caller's
   * terminals grant (same decoupling as the products completeness picker):
   * active products, the live warehouse tree flattened with depth for
   * indentation, and active merchants.
   */
  productOptions(): Promise<ProductOption[]> {
    return listProductOptions();
  }

  async warehouseOptions(): Promise<TerminalWarehouseOption[]> {
    const roots = buildWarehouseTree(await listAllWarehouses());
    const options: TerminalWarehouseOption[] = [];
    const walk = (node: WarehouseTreeNode, depth: number) => {
      options.push({
        id: node.id,
        name: node.name,
        code: node.code,
        type: node.type,
        depth,
      });
      for (const child of node.children) walk(child, depth + 1);
    };
    for (const root of roots) walk(root, 0);
    return options;
  }

  merchantOptions(): Promise<MerchantOption[]> {
    return listMerchantOptions();
  }

  async create(
    dto: CreateTerminalDto,
    changedByUserId: string | null,
  ): Promise<TerminalDetailRow> {
    const result = await createTerminal(dto, changedByUserId);
    if (result.ok) return result.terminal;
    throw writeException(result.error);
  }

  async update(
    id: string,
    dto: UpdateTerminalDto,
    changedByUserId: string | null,
  ): Promise<TerminalDetailRow> {
    const result = await updateTerminal(id, dto, changedByUserId);
    if (result.ok) return result.terminal;
    if (result.error === 'not-found') {
      throw new NotFoundException('Terminal not found.');
    }
    throw writeException(result.error);
  }

  /** Soft delete (stamps `deletedAt`); the status history stays intact. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteTerminal(id);
    if (result.ok) return { id };
    throw new NotFoundException('Terminal not found.');
  }
}
