import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createProduct,
  findProductById,
  listItemCategoryOptions,
  listProducts,
  softDeleteProduct,
  toggleProductStatus,
  updateProduct,
} from '@repo/db';
import type {
  ItemCategoryOption,
  ListProductsOptions,
  ProductDetailRow,
  ProductListPage,
} from '@repo/db';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  /**
   * One page of products with optional search/category/status filters plus
   * the filtered total (the query itself lives in @repo/db).
   */
  list(options: ListProductsOptions): Promise<ProductListPage> {
    return listProducts(options);
  }

  /**
   * The completeness-item choices of the product editor: every live ACTIVE
   * item category, served under the products grant so the editor never
   * needs the item-categories module grant on top of it.
   */
  completenessItemOptions(): Promise<ItemCategoryOption[]> {
    return listItemCategoryOptions();
  }

  /** One product with its full standard completeness list. */
  async get(id: string): Promise<ProductDetailRow> {
    const product = await findProductById(id);
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductDetailRow> {
    const result = await createProduct(dto);
    if (result.ok) return result.product;

    switch (result.error) {
      case 'name-taken':
        throw new ConflictException('Product model name is already in use.');
      case 'duplicate-item':
        throw new BadRequestException(
          'The same completeness item cannot be listed twice on one product.',
        );
      default:
        throw new BadRequestException(
          'One of the completeness items no longer exists in the Item Categories master.',
        );
    }
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDetailRow> {
    const result = await updateProduct(id, dto);
    if (result.ok) return result.product;

    switch (result.error) {
      case 'name-taken':
        throw new ConflictException('Product model name is already in use.');
      case 'duplicate-item':
        throw new BadRequestException(
          'The same completeness item cannot be listed twice on one product.',
        );
      case 'item-not-found':
        throw new BadRequestException(
          'One of the completeness items no longer exists in the Item Categories master.',
        );
      default:
        throw new NotFoundException('Product not found.');
    }
  }

  /** Flips ACTIVE ⇄ INACTIVE — the table's quick status toggle. */
  async toggleStatus(id: string): Promise<ProductDetailRow> {
    const result = await toggleProductStatus(id);
    if (result.ok) return result.product;
    throw new NotFoundException('Product not found.');
  }

  /** Soft delete (stamps `deletedAt`); future terminal references survive. */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeleteProduct(id);
    if (result.ok) return { id };
    throw new NotFoundException('Product not found.');
  }
}
