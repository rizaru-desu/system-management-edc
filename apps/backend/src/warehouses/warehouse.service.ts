import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createWarehouse,
  findWarehouseById,
  listAllWarehouses,
  listEligibleParents,
  listWarehouseChildren,
  listWarehouses,
  softDeleteWarehouse,
  toggleWarehouseStatus,
  updateWarehouse,
} from '@repo/db';
import type {
  ListWarehousesOptions,
  WarehouseListPage,
  WarehouseParentError,
  WarehouseRow,
} from '@repo/db';
import { WAREHOUSE_PARENT_TYPE } from '@repo/db/schema';
import type { WarehouseType } from '@repo/db/schema';
import type { CreateWarehouseDto } from './dto/create-warehouse.dto';
import type { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { buildWarehouseTree } from './utils/tree-builder.util';
import type { WarehouseTreeNode } from './utils/tree-builder.util';

/** Detail payload: the row plus its parent and direct children. */
export interface WarehouseDetail {
  warehouse: WarehouseRow;
  parent: WarehouseRow | null;
  children: WarehouseRow[];
}

const TYPE_LABELS: Record<WarehouseType, string> = {
  CENTRAL: 'Central',
  REGIONAL: 'Regional',
  SERVICE_POINT: 'Service Point',
};

/** Human wording of the parent-ladder violations, shared by create/update. */
function parentRuleException(
  error: WarehouseParentError,
  type: WarehouseType,
): BadRequestException {
  const requiredType = WAREHOUSE_PARENT_TYPE[type];
  switch (error) {
    case 'parent-not-allowed':
      return new BadRequestException(
        'A Central warehouse sits at the top level and cannot have a parent.',
      );
    case 'parent-required':
      return new BadRequestException(
        `A ${TYPE_LABELS[type]} warehouse requires a ${TYPE_LABELS[requiredType!]} parent warehouse.`,
      );
    case 'parent-not-found':
      return new BadRequestException('Parent warehouse not found.');
    case 'parent-wrong-type':
      return new BadRequestException(
        `A ${TYPE_LABELS[type]} warehouse must sit under a ${TYPE_LABELS[requiredType!]} warehouse.`,
      );
  }
}

@Injectable()
export class WarehouseService {
  /**
   * One page of warehouses with optional search/type/region/status filters
   * plus the filtered total; every row carries its parent name/code (the
   * query itself lives in @repo/db).
   */
  list(options: ListWarehousesOptions): Promise<WarehouseListPage> {
    return listWarehouses(options);
  }

  /** The full live hierarchy as recursive nodes (Central → … → SP). */
  async tree(): Promise<WarehouseTreeNode[]> {
    return buildWarehouseTree(await listAllWarehouses());
  }

  /** One warehouse plus its parent and direct children (not grandchildren). */
  async detail(id: string): Promise<WarehouseDetail> {
    const warehouse = await findWarehouseById(id);
    if (!warehouse) throw new NotFoundException('Warehouse not found.');
    const [parent, children] = await Promise.all([
      warehouse.parentId ? findWarehouseById(warehouse.parentId) : null,
      listWarehouseChildren(id),
    ]);
    return { warehouse, parent, children };
  }

  /** The live direct children of one warehouse. */
  async children(id: string): Promise<WarehouseRow[]> {
    const warehouse = await findWarehouseById(id);
    if (!warehouse) throw new NotFoundException('Warehouse not found.');
    return listWarehouseChildren(id);
  }

  /** Valid parent choices for a `type` warehouse (the level above it). */
  eligibleParents(
    type: WarehouseType,
    excludeId?: string,
  ): Promise<WarehouseRow[]> {
    return listEligibleParents(type, excludeId);
  }

  async create(dto: CreateWarehouseDto): Promise<WarehouseRow> {
    const result = await createWarehouse(dto);
    if (result.ok) return result.warehouse;

    if (result.error === 'code-taken') {
      throw new ConflictException('Warehouse code is already in use.');
    }
    throw parentRuleException(result.error, dto.type);
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<WarehouseRow> {
    const result = await updateWarehouse(id, dto);
    if (result.ok) return result.warehouse;

    switch (result.error) {
      case 'code-taken':
        throw new ConflictException('Warehouse code is already in use.');
      case 'type-locked-has-children':
        throw new ConflictException(
          'Cannot change the type of a warehouse that still has child warehouses.',
        );
      case 'parent-self':
        throw new BadRequestException('A warehouse cannot be its own parent.');
      case 'parent-cycle':
        throw new BadRequestException(
          'This parent would create a circular hierarchy.',
        );
      case 'not-found':
        throw new NotFoundException('Warehouse not found.');
      default: {
        // The parent-ladder errors need the effective type for wording; a
        // parent-only PATCH falls back to reading the stored record.
        const type = dto.type ?? (await findWarehouseById(id))?.type;
        throw parentRuleException(result.error, type ?? 'CENTRAL');
      }
    }
  }

  /** Flips ACTIVE ⇄ INACTIVE — the table's quick status toggle. */
  async toggleStatus(id: string): Promise<WarehouseRow> {
    const result = await toggleWarehouseStatus(id);
    if (result.ok) return result.warehouse;

    if (result.error === 'has-active-children') {
      throw new ConflictException(
        'Cannot deactivate a warehouse that still has active child warehouses. Deactivate its children first.',
      );
    }
    throw new NotFoundException('Warehouse not found.');
  }

  /** Soft delete; refused while the warehouse still has live children. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteWarehouse(id);
    if (result.ok) return { id };

    if (result.error === 'has-children') {
      throw new ConflictException(
        'Cannot delete a warehouse that still has child warehouses. Delete or move its children first.',
      );
    }
    throw new NotFoundException('Warehouse not found.');
  }
}
