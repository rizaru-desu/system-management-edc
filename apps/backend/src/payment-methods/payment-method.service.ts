import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createPaymentMethod,
  findPaymentMethodById,
  listActivePaymentMethods,
  listPaymentMethods,
  softDeletePaymentMethod,
  togglePaymentMethodStatus,
  updatePaymentMethod,
} from '@repo/db';
import type {
  ListPaymentMethodsOptions,
  PaymentMethodListPage,
  PaymentMethodOption,
  PaymentMethodRow,
  PaymentMethodWriteError,
} from '@repo/db';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import type { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

/** Human wording of the shared create/update uniqueness violations. */
function writeException(error: PaymentMethodWriteError): ConflictException {
  switch (error) {
    case 'name-taken':
      return new ConflictException(
        'A payment method with this name already exists.',
      );
    case 'code-taken':
      return new ConflictException(
        'A payment method with this code already exists.',
      );
  }
}

@Injectable()
export class PaymentMethodService {
  /**
   * One page of payment methods with optional search/status filters plus
   * the filtered total; the products-using count comes joined (the query
   * lives in @repo/db).
   */
  list(options: ListPaymentMethodsOptions): Promise<PaymentMethodListPage> {
    return listPaymentMethods(options);
  }

  /** Active methods only — the lightweight dropdown feed. */
  active(): Promise<PaymentMethodOption[]> {
    return listActivePaymentMethods();
  }

  async get(id: string): Promise<PaymentMethodRow> {
    const method = await findPaymentMethodById(id);
    if (!method) throw new NotFoundException('Payment method not found.');
    return method;
  }

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethodRow> {
    const result = await createPaymentMethod(dto);
    if (result.ok) return result.paymentMethod;
    throw writeException(result.error);
  }

  async update(
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodRow> {
    const result = await updatePaymentMethod(id, dto);
    if (result.ok) return result.paymentMethod;
    if (result.error === 'not-found') {
      throw new NotFoundException('Payment method not found.');
    }
    throw writeException(result.error);
  }

  /** Flips ACTIVE ⇄ INACTIVE — the table's quick status toggle. */
  async toggleStatus(id: string): Promise<PaymentMethodRow> {
    const result = await togglePaymentMethodStatus(id);
    if (result.ok) return result.paymentMethod;
    throw new NotFoundException('Payment method not found.');
  }

  /**
   * Soft delete — refused while any live product still links the method,
   * so the future settlement checklists can never lose a method products
   * claim to support.
   */
  async remove(id: string): Promise<{ id: string }> {
    const result = await softDeletePaymentMethod(id);
    if (result.ok) return { id };
    if (result.error === 'not-found') {
      throw new NotFoundException('Payment method not found.');
    }
    throw new BadRequestException(
      `This payment method is still linked to ${result.productCount} product${result.productCount === 1 ? '' : 's'} — remove it from those products first.`,
    );
  }
}
