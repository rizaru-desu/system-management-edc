import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createProduct,
  findProductById,
  listActivePaymentMethods,
  listItemCategoryOptions,
  listProducts,
  softDeleteProduct,
  toggleProductStatus,
  updateProduct,
} from '@repo/db';
import type {
  ItemCategoryOption,
  PaymentMethodOption,
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

  /**
   * Active payment methods for the editor's Payment Methods tab, served
   * under the caller's products grant (the same decoupling as the
   * completeness picker).
   */
  paymentMethodOptions(): Promise<PaymentMethodOption[]> {
    return listActivePaymentMethods();
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
      case 'duplicate-method':
        throw new BadRequestException(
          'The same payment method cannot be linked twice on one product.',
        );
      case 'method-not-found':
        throw new BadRequestException(
          'One of the payment methods no longer exists in the Payment Methods master.',
        );
      case 'method-not-active':
        throw new BadRequestException(
          'Only active payment methods can be linked to a product.',
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
      case 'duplicate-method':
        throw new BadRequestException(
          'The same payment method cannot be linked twice on one product.',
        );
      case 'method-not-found':
        throw new BadRequestException(
          'One of the payment methods no longer exists in the Payment Methods master.',
        );
      case 'method-not-active':
        throw new BadRequestException(
          'Only active payment methods can be linked to a product.',
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
