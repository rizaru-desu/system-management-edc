import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createItemCategory,
  findItemCategoryById,
  listItemCategories,
  softDeleteItemCategory,
  toggleItemCategoryStatus,
  updateItemCategory,
} from '@repo/db';
import type {
  ItemCategoryListPage,
  ItemCategoryRow,
  ListItemCategoriesOptions,
} from '@repo/db';
import type { CreateItemCategoryDto } from './dto/create-item-category.dto';
import type { UpdateItemCategoryDto } from './dto/update-item-category.dto';

@Injectable()
export class ItemCategoryService {
  /**
   * One page of item categories with optional search/category/status
   * filters plus the filtered total (the query itself lives in @repo/db).
   */
  list(options: ListItemCategoriesOptions): Promise<ItemCategoryListPage> {
    return listItemCategories(options);
  }

  async get(id: string): Promise<ItemCategoryRow> {
    const itemCategory = await findItemCategoryById(id);
    if (!itemCategory) throw new NotFoundException('Item category not found.');
    return itemCategory;
  }

  async create(dto: CreateItemCategoryDto): Promise<ItemCategoryRow> {
    const result = await createItemCategory(dto);
    if (result.ok) return result.itemCategory;

    if (result.error === 'name-taken') {
      throw new ConflictException('Item name is already in use.');
    }
    throw new ConflictException('Item code is already in use.');
  }

  async update(
    id: string,
    dto: UpdateItemCategoryDto,
  ): Promise<ItemCategoryRow> {
    const result = await updateItemCategory(id, dto);
    if (result.ok) return result.itemCategory;

    switch (result.error) {
      case 'name-taken':
        throw new ConflictException('Item name is already in use.');
      case 'code-taken':
        throw new ConflictException('Item code is already in use.');
      default:
        throw new NotFoundException('Item category not found.');
    }
  }

  /** Flips ACTIVE ⇄ INACTIVE — the table's quick status toggle. */
  async toggleStatus(id: string): Promise<ItemCategoryRow> {
    const result = await toggleItemCategoryStatus(id);
    if (result.ok) return result.itemCategory;
    throw new NotFoundException('Item category not found.');
  }

  /** Soft delete (stamps `deletedAt`); future product references survive. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteItemCategory(id);
    if (result.ok) return { id };
    throw new NotFoundException('Item category not found.');
  }
}
